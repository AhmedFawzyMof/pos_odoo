<script setup lang="ts">
import { computed, watch } from "vue";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie } from "vue-chartjs";
import { ChartContainer } from "@/components/ui/chart";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

const props = defineProps<{
  chart: {
    type: string;
    labels: string[];
    datasets: { label: string; data: number[] }[];
  } | null;
  title?: string;
}>();

const getChartColor = (i: number): string => {
  if (typeof document === "undefined") return "#888";
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(`--chart-${i + 1}`)
      .trim() || `hsl(${(i * 60) % 360}, 70%, 50%)`
  );
};

const colors = computed(() => [0, 1, 2, 3, 4].map((i) => getChartColor(i)));

const chartData = computed(() => {
  if (!props.chart) return { labels: [], datasets: [] };
  const isPie = props.chart.type === "pie";
  return {
    labels: props.chart.labels,
    datasets: props.chart.datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: isPie
        ? colors.value.slice(0, ds.data.length)
        : colors.value[i % colors.value.length],
      borderColor: isPie
        ? colors.value.slice(0, ds.data.length)
        : colors.value[i % colors.value.length],
      borderWidth: isPie ? 2 : 1,
      borderRadius: !isPie ? 4 : 0,
      tension: !isPie && props.chart!.type === "line" ? 0.3 : undefined,
    })),
  };
});

const chartOptions = computed(() => {
  const isPie = props.chart?.type === "pie";
  return {
    responsive: true,
    maintainAspectRatio: false,
    locale: "en-US" as const,
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        rtl: true,
        labels: {
          font: { family: "var(--font-sans, sans-serif)", size: 12 },
          usePointStyle: true,
          padding: 16,
          boxWidth: 10,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "hsl(var(--popover))",
        titleColor: "hsl(var(--popover-foreground))",
        bodyColor: "hsl(var(--muted-foreground))",
        borderColor: "hsl(var(--border))",
        borderWidth: 1,
        padding: 8,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => {
            const value =
              typeof ctx.raw === "number"
                ? ctx.raw.toLocaleString("en-US")
                : ctx.raw;
            return ` ${ctx.dataset.label}: ${value}`;
          },
        },
      },
    },
    scales: isPie
      ? undefined
      : {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "var(--font-sans, sans-serif)", size: 11 },
              maxRotation: 45,
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: "hsl(var(--border) / 0.3)" },
            ticks: {
              font: { family: "var(--font-sans, sans-serif)", size: 11 },
              callback: (v: any) =>
                typeof v === "number" ? v.toLocaleString("en-US") : v,
            },
          },
        },
  };
});

const chartConfigForContainer = computed(() => {
  if (!props.chart) return {};
  const config: Record<string, any> = {};
  props.chart.datasets.forEach((ds, i) => {
    config[ds.label] = {
      label: ds.label,
      color: colors.value[i % colors.value.length],
    };
  });
  return config;
});

watch(chartData, (v) => {
  console.log(`[ReportChart] chartData:`, v);
}, { deep: true });
</script>

<template>
  <div v-if="chart" class="bg-white border border-outline-variant rounded-xl p-6">
    <h4 v-if="title" class="text-headline-sm font-bold mb-4">{{ title }}</h4>

    <ChartContainer
      :config="chartConfigForContainer"
      class="min-h-[350px] w-full"
    >
      <Bar
        v-if="chart.type === 'bar'"
        :key="chartData.labels?.join(',') ?? 'empty'"
        :data="chartData"
        :options="chartOptions"
      />
      <Line
        v-else-if="chart.type === 'line'"
        :key="chartData.labels?.join(',') ?? 'empty'"
        :data="chartData"
        :options="chartOptions"
      />
      <Pie
        v-else-if="chart.type === 'pie'"
        :key="chartData.labels?.join(',') ?? 'empty'"
        :data="chartData"
        :options="chartOptions"
      />
    </ChartContainer>
  </div>
</template>
