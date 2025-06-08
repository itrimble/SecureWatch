import { InteractiveFieldExtractor } from '@/components/field-extraction/interactive-field-extractor';

export default function FieldExtractionPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <InteractiveFieldExtractor />
    </div>
  );
}

export const metadata = {
  title: 'Field Extraction | SecureWatch SIEM',
  description: 'Interactive field extraction tool for log analysis',
};