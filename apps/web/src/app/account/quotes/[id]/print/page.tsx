import { QuotePrintClient } from '@/components/quote-print';

export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuotePrintClient id={id} />;
}
