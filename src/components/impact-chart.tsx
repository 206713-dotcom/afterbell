"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "./store";
import { accessibleSparks } from "@/lib/discovery";
export default function ImpactChart() {
  const { state } = useApp();
  const visible = accessibleSparks(state);
  const data = ["Badminton", "Study", "Tutoring", "Community"].map((label) => {
    const key = label.toLowerCase();
    const sparks = visible.filter((s) => s.category === key);
    return {
      name: label,
      Sparks: sparks.length,
      Feasible: sparks.filter(
        (s) =>
          !["CONFIRMED", "COMPLETED"].includes(s.status) &&
          state.proposals.some((p) => p.sparkId === s.id && p.feasible),
      ).length,
      Confirmed: sparks.filter((s) => s.status === "CONFIRMED").length,
      Completed: sparks.filter((s) => s.status === "COMPLETED").length,
    };
  });
  return (
    <div
      className="chart-container"
      role="img"
      aria-label={`Activity impact: ${visible.length} Sparks, ${data.reduce((total, item) => total + item.Feasible, 0)} feasible proposals, ${visible.filter((s) => s.status === "CONFIRMED").length} confirmed and ${visible.filter((s) => s.status === "COMPLETED").length} completed.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barGap={4}
          margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 5"
            vertical={false}
            stroke="#e8edde"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#536b46" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "#536b46" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              borderColor: "#dfe6d3",
            }}
            cursor={{ fill: "#f4f7ee" }}
          />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 10, paddingTop: 15 }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="Sparks"
            fill="#d8e4c9"
            radius={[3, 3, 0, 0]}
            maxBarSize={25}
          />
          <Bar
            isAnimationActive={false}
            dataKey="Feasible"
            fill="#a8c881"
            radius={[3, 3, 0, 0]}
            maxBarSize={25}
          />
          <Bar
            isAnimationActive={false}
            dataKey="Confirmed"
            fill="#547e3e"
            radius={[3, 3, 0, 0]}
            maxBarSize={25}
          />
          <Bar
            isAnimationActive={false}
            dataKey="Completed"
            fill="#173d2c"
            radius={[3, 3, 0, 0]}
            maxBarSize={25}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
