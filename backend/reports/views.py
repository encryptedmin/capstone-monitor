import io

from django.db.models import Count, Q
from django.http import FileResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrAdviser
from capstones.models import CapstoneGroup
from milestones.models import Milestone
from submissions.models import Submission


class DepartmentAnalyticsView(APIView):
    """
    'Monitor Department Analytics' use case: JSON summary powering the
    admin/adviser dashboard -- group counts, milestone completion rates,
    submission review backlog.
    """

    permission_classes = [IsAdminOrAdviser]

    def get(self, request):
        groups = CapstoneGroup.objects.all()
        if request.user.is_adviser:
            groups = groups.filter(adviser=request.user)

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
                "adviser": g.adviser.username if g.adviser else None,
                "members": g.members.count(),
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
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        groups = CapstoneGroup.objects.all()
        if request.user.is_adviser:
            groups = groups.filter(adviser=request.user)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = [
            Paragraph("ITE Department - Capstone Progress Report", styles["Title"]),
            Spacer(1, 16),
        ]

        data = [["Capstone Title", "Adviser", "Members", "Milestones Done", "Total Milestones"]]
        for g in groups:
            data.append(
                [
                    g.capstone_title,
                    g.adviser.username if g.adviser else "Unassigned",
                    str(g.members.count()),
                    str(g.milestones.filter(status=Milestone.Status.COMPLETED).count()),
                    str(g.milestones.count()),
                ]
            )

        table = Table(data, hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4B2E83")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.whitesmoke]),
                ]
            )
        )
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        return FileResponse(
            buffer, as_attachment=False, filename="capstone_progress_report.pdf"
        )
