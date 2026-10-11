import { useEffect, useState, useCallback } from "react";
import { groupsApi, milestonesApi, submissionsApi } from "../../lib/api";

// A student can accumulate more than one CapstoneGroup row over time (a
// rejected request, followed by a fresh request to a different adviser),
// but the backend only ever allows one *active* (pending or accepted) row
// at a time. Pick, in order of preference: the accepted group, else the
// pending request, else the most recently decided (rejected) one so the
// "choose an adviser" screen can still show why it was rejected.
function pickCurrentGroup(groups) {
  const byRecency = [...groups].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  return (
    byRecency.find((g) => g.status === "accepted") ||
    byRecency.find((g) => g.status === "pending") ||
    byRecency[0] ||
    null
  );
}

// Shared data-loading hook for all student pages: the student's current
// capstone group, its milestones, and its submissions.
export function useMyGroup() {
  const [group, setGroup] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: groups } = await groupsApi.list();
    const list = groups.results ?? groups;
    const myGroup = pickCurrentGroup(list);
    setGroup(myGroup);

    if (myGroup && myGroup.status === "accepted") {
      const [{ data: ms }, { data: subs }] = await Promise.all([
        milestonesApi.list(),
        submissionsApi.list(),
      ]);
      setMilestones((ms.results ?? ms).filter((m) => m.group === myGroup.id));
      setSubmissions((subs.results ?? subs).filter((s) => s.group === myGroup.id));
    } else {
      setMilestones([]);
      setSubmissions([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { group, milestones, submissions, loading, reload: load };
}
