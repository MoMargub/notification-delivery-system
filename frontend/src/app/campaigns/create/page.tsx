import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreateCampaignForm } from '@/components/campaigns/CreateCampaignForm';

export default function CreateCampaignPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={16} />
          Back to Campaigns
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="mt-1 text-sm text-gray-500">Choose a channel, pick the audience and schedule the delivery.</p>
      </div>
      <CreateCampaignForm />
    </div>
  );
}
