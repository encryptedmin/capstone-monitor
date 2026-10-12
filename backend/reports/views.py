import io
from xml.sax.saxutils import escape

from django.db.models import Count, Q
from django.http import FileResponse
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import SchoolYear, SystemSetting
from accounts.permissions import IsAdminOrAdviser
from capstones.models import CapstoneGroup
from milestones.models import Milestone
from submissions.models import Submission


def _school_year_filtered(groups, request):
    """
    Applies the admin display school-year toggle for admin reports, unless
    the caller passes an explicit ?school_year=<id> to look at a specific
    term without changing that saved setting. Adviser reports are scoped to
    the adviser's own groups and are not affected by the admin display toggle.
    """
    school_year = request.query_params.get("school_year")
    if school_year == "all":
        return groups
    if school_year:
        return groups.filter(school_year_id=school_year)
    if request.user.is_adviser:
        return groups
    display_year = SystemSetting.load().display_school_year_id
    if display_year:
        return groups.filter(school_year_id=display_year)
    return groups


def _user_display_name(user):
    if not user:
        return "Unassigned"
    adviser_name = getattr(getattr(user, "adviser_profile", None), "full_name", "")
    student_name = getattr(getattr(user, "student_profile", None), "full_name", "")
    full_name = user.get_full_name()
    return adviser_name or student_name or full_name or user.email


def _member_display_name(member):
    if member.student_name_snapshot:
        return member.student_name_snapshot
    return _user_display_name(member.student)


def _group_member_names(group):
    names = [_member_display_name(member) for member in group.members.all()]
    return names or ["No students assigned"]


def _report_groups(request):
    groups = CapstoneGroup.objects.select_related(
        "adviser",
        "adviser__adviser_profile",
        "school_year",
    ).prefetch_related(
        "members",
        "members__student",
        "members__student__student_profile",
        "milestones",
    )
    if request.user.is_adviser:
        groups = groups.filter(adviser=request.user)
    return _school_year_filtered(groups, request).order_by("capstone_title")


def _school_year_scope_label(request):
    school_year = request.query_params.get("school_year")
    if school_year == "all":
        return "All school years"
    if school_year:
        selected_year = SchoolYear.objects.filter(pk=school_year).first()
        return selected_year.label if selected_year else "Selected school year"
    display_year = SystemSetting.load().display_school_year
    return display_year.label if display_year else "All school years"


class DepartmentAnalyticsView(APIView):
    """
    'Monitor Department Analytics' use case: JSON summary powering the
    admin/adviser dashboard -- group counts, milestone completion rates,
    submission review backlog.
    """

    permission_classes = [IsAdminOrAdviser]

    def get(self, request):
        groups = _report_groups(request)

        milestone_counts = Milestone.objects.filter(group__in=groups).aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(status=Milestone.Status.COMPLETED)),
            overdue=Count("id", filter=Q(status=Milestone.Status.OVERDUE)),
            in_progress=Count("id", filter=Q(status=Milestone.Status.IN_PROGRESS)),
            pending=Count("id", filter=Q(status=Milestone.Status.PENDING)),
        )
        submission_counts = Submission.objects.filter(group__in=groups).aggregate(
            total=Count("id"),
            pending_review=Count("id", filter=Q(status=Submission.Status.PENDING)),
            approved=Count("id", filter=Q(status=Submission.Status.APPROVED)),
            revision_needed=Count("id", filter=Q(status=Submission.Status.REVISION_NEEDED)),
        )

        per_group = [
            {
                "group": g.capstone_title,
                "adviser": _user_display_name(g.adviser),
                "members": ", ".join(_group_member_names(g)),
                "milestones_completed": g.milestones.filter(
                    status=Milestone.Status.COMPLETED
                ).count(),
                "milestones_total": g.milestones.count(),
            }
            for g in groups
        ]

        return Response(
            {
                "group_count": groups.count(),
                "milestones": milestone_counts,
                "submissions": submission_counts,
                "per_group": per_group,
            }
        )


class DepartmentPdfReportView(APIView):
    """
    'Generate Reports' use case: a printable PDF snapshot of every
    capstone group's progress, for the Administrator/Research Coordinator.
    """

    permission_classes = [IsAdminOrAdviser]

    def get(self, request):
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT
        from reportlab.lib.pagesizes import landscape, letter
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )

        groups = _report_groups(request)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            rightMargin=36,
            leftMargin=36,
            topMargin=34,
            bottomMargin=34,
            title="Capstone Progress Report",
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Title"],
            textColor=colors.HexColor("#172033"),
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            alignment=TA_CENTER,
            spaceAfter=4,
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            textColor=colors.HexColor("#5F6B7A"),
            fontSize=8.5,
            leading=11,
            alignment=TA_CENTER,
        )
        cell_style = ParagraphStyle(
            "ReportCell",
            parent=styles["BodyText"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#1F2937"),
        )
        header_style = ParagraphStyle(
            "ReportHeader",
            parent=cell_style,
            fontName="Helvetica-Bold",
            textColor=colors.white,
        )
        number_style = ParagraphStyle(
            "ReportNumber",
            parent=cell_style,
            alignment=TA_RIGHT,
        )

        generated_at = timezone.localtime(timezone.now()).strftime("%B %d, %Y %I:%M %p")
        scope = _school_year_scope_label(request)

        elements = [
            Paragraph("Information Technology Education", title_style),
            Paragraph("Capstone Progress Report", title_style),
            Paragraph(f"Scope: {escape(scope)} | Generated: {escape(generated_at)}", subtitle_style),
            Spacer(1, 18),
        ]

        def paragraph(value, style=cell_style):
            return Paragraph(escape(str(value)).replace("\n", "<br/>"), style)

        data = [
            [
                paragraph("Capstone Title", header_style),
                paragraph("Adviser", header_style),
                paragraph("Members", header_style),
                paragraph("Milestones Done", header_style),
                paragraph("Total Milestones", header_style),
            ]
        ]
        for g in groups:
            data.append(
                [
                    paragraph(g.capstone_title),
                    paragraph(_user_display_name(g.adviser)),
                    paragraph("\n".join(_group_member_names(g))),
                    paragraph(str(g.milestones.filter(status=Milestone.Status.COMPLETED).count()), number_style),
                    paragraph(str(g.milestones.count()), number_style),
                ]
            )

        table = Table(
            data,
            colWidths=[230, 130, 220, 70, 70],
            hAlign="CENTER",
            repeatRows=1,
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#172033")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#0F172A")),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D6DCE5")),
                    ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#AAB4C3")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F9FC")]),
                ]
            )
        )
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        return FileResponse(
            buffer, as_attachment=False, filename="capstone_progress_report.pdf"
        )
