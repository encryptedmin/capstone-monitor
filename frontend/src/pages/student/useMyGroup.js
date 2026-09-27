import { useEffect, useState, useCallback } from "react";
import { groupsApi, milestonesApi, submissionsApi } from "../../lib/api";

// Shared data-loading hook for all student pages: the student's single
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
    const myGroup = list[0] ?? null;
    setGroup(myGroup);

    if (myGroup) {
      const [{ data: ms }, { data: subs }] = await Promise.all([
        milestonesApi.list(),
        submissionsApi.list(),
      ]);
      setMilestones((ms.results ?? ms).filter((m) => m.group === myGroup.id));
      setSubmissions((subs.results ?? subs).filter((s) => s.group === myGroup.id));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { group, milestones, submissions, loading, reload: load };
}
