import InsightsPage from "@/app/insights/InsightPage"; // Jika Anda memisahkan komponennya
// Atau langsung masukkan kode di sini

export const metadata = {
  title: "Insights | MyReceipts",
  description: "Review your spending habits and top merchants",
};

export default function Page() {
  return <InsightsPage />;
}