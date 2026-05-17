import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

export const useRenstraPaguCache = ({
  renstra_id,
  stage,
  ref_ids,
}) => {
  return useQuery({
    queryKey: ["pagu-cache", stage, ref_ids],
    queryFn: async () => {
      if (!ref_ids?.length) return [];

      const res = await api.get("/renstra-pagu-cache", {
        params: {
          renstra_id,
          stage,
          ref_id: ref_ids,
        },
      });

      return res.data;
    },
    enabled: !!ref_ids?.length,
  });
};