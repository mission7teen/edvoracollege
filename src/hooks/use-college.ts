import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CollegeState {
  loading: boolean;
  collegeId: string | null;
  name: string | null;
  setupCompleted: boolean;
  isOwner: boolean;
  refresh: () => Promise<void>;
}

/** Reads the college (tenant) the signed-in account belongs to. */
export function useCollege(): CollegeState {
  const [state, setState] = useState<Omit<CollegeState, "refresh">>({
    loading: true,
    collegeId: null,
    name: null,
    setupCompleted: false,
    isOwner: false,
  });

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setState({ loading: false, collegeId: null, name: null, setupCompleted: false, isOwner: false });
      return;
    }
    const { data: college } = await supabase
      .from("colleges")
      .select("id, name, setup_completed, owner_id")
      .limit(1)
      .maybeSingle();
    setState({
      loading: false,
      collegeId: college?.id ?? null,
      name: college?.name ?? null,
      setupCompleted: !!college?.setup_completed,
      isOwner: college?.owner_id === uid,
    });
  };

  useEffect(() => {
    void load();
  }, []);

  return { ...state, refresh: load };
}

/** Returns the college id for the signed-in account, or null when setup is pending. */
export async function fetchMyCollege() {
  const { data } = await supabase
    .from("colleges")
    .select("id, name, setup_completed")
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
