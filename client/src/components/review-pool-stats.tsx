import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw, ArrowUp, ArrowDown } from "lucide-react";

interface ReviewPoolStatsData {
  total: number;
}

export function ReviewPoolStats() {
  const { data } = useQuery<ReviewPoolStatsData>({
    queryKey: ["/api/review-pool/stats"],
    refetchInterval: 5000,
  });

  const [lastTotal, setLastTotal] = useState<number | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "none">("none");

  useEffect(() => {
    if (data) {
      if (lastTotal !== null) {
        if (data.total > lastTotal) setTrend("up");
        else if (data.total < lastTotal) setTrend("down");
        else setTrend("none");
      }
      setLastTotal(data.total);
    }
  }, [data]);

  if (!data) return null;

  return (
    <div className="flex items-center text-sm text-gray-500 mt-2">
      <RotateCcw className="h-4 w-4 mr-1" />
      {data.total} Fragen im Wiederholungspool
      {trend === "up" && <ArrowUp className="h-4 w-4 text-red-500 ml-1" />}
      {trend === "down" && <ArrowDown className="h-4 w-4 text-green-500 ml-1" />}
    </div>
  );
}
