'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle, Mail, Smartphone, Users } from 'lucide-react';
import { Button, buttonStyles } from '@/components/common/Button';
import { Field, inputClass } from '@/components/common/Field';
import { useCreateCampaign } from '@/hooks/useCreateCampaign';
import { useUsers } from '@/hooks/useUsers';
import { formatNumber } from '@/lib/format';
import type { Campaign } from '@/types/campaign.types';
import { UserPicker } from './UserPicker';

const MAX_SELECTED_USERS = 10_000;

const campaignSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
    message: z
      .string()
      .trim()
      .min(10, 'Message must be at least 10 characters')
      .max(1000, 'Message cannot exceed 1000 characters'),
    channel: z.enum(['EMAIL', 'PUSH']),
    scheduledAt: z.string().min(1, 'Please choose a scheduled time'),
    audience: z.enum(['all', 'selected']),
    userIds: z.array(z.number()),
  })
  .refine((v) => v.audience === 'all' || v.userIds.length > 0, {
    path: ['userIds'],
    message: 'Select at least one user',
  })
  .refine((v) => v.userIds.length <= MAX_SELECTED_USERS, {
    path: ['userIds'],
    message: `Select at most ${formatNumber(MAX_SELECTED_USERS)} users, or target all users`,
  });

type CampaignFormValues = z.infer<typeof campaignSchema>;

const CHANNELS = [
  { value: 'EMAIL', label: 'Email', description: 'Rich-text email delivered to the user address.', Icon: Mail },
  { value: 'PUSH', label: 'Push notification', description: 'Short real-time message to the user device.', Icon: Smartphone },
] as const;

/** Value for <input type="datetime-local">: tomorrow, 10:00 local time. */
function defaultScheduledAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function CreateCampaignForm() {
  const createCampaign = useCreateCampaign();
  const [created, setCreated] = useState<Campaign | null>(null);
  const { data: allUsers } = useUsers({ limit: 1 });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: '',
      message: '',
      channel: 'EMAIL',
      scheduledAt: defaultScheduledAt(),
      audience: 'all',
      userIds: [],
    },
  });

  const audience = watch('audience');
  const selectedCount = audience === 'all' ? (allUsers?.total ?? 0) : watch('userIds').length;

  const onSubmit = handleSubmit(async (values) => {
    const campaign = await createCampaign.mutateAsync({
      title: values.title,
      message: values.message,
      channel: values.channel,
      scheduledAt: new Date(values.scheduledAt).toISOString(),
      userIds: values.audience === 'selected' ? values.userIds : undefined,
    });
    setCreated(campaign);
  });

  if (created) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-6 py-14 text-center shadow-xs">
        <CheckCircle size={40} className="text-green-600" />
        <h2 className="mt-4 text-xl font-bold text-gray-900">Campaign created</h2>
        <p className="mt-1 max-w-md text-sm text-gray-500">
          <strong>{created.title}</strong> is queued for {formatNumber(created.totalRecipients)} recipients and will be
          delivered by the background workers at the scheduled time.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href={`/campaigns/${created.id}`} className={buttonStyles('primary')}>
            View campaign
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              createCampaign.reset();
              reset();
              setCreated(null);
            }}
          >
            Create another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
      {createCampaign.isError && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {createCampaign.error.message}
        </div>
      )}

      <Field label="Campaign title" htmlFor="title" error={errors.title?.message}>
        <input
          id="title"
          placeholder="e.g. Q4 platform maintenance window"
          className={inputClass(!!errors.title)}
          {...register('title')}
        />
      </Field>

      <Field label="Delivery channel" error={errors.channel?.message}>
        <Controller
          control={control}
          name="channel"
          render={({ field }) => (
            <div className="grid gap-3 sm:grid-cols-2">
              {CHANNELS.map(({ value, label, description, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={field.value === value}
                  onClick={() => field.onChange(value)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left ${
                    field.value === value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} className="mt-0.5 text-indigo-600" />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">{label}</span>
                    <span className="block text-xs text-gray-500">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        />
      </Field>

      <Field label="Target users" error={errors.userIds?.message}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-4 text-sm">
            {(['all', 'selected'] as const).map((value) => (
              <label key={value} className="flex items-center gap-2">
                <input type="radio" value={value} className="accent-indigo-600" {...register('audience')} />
                {value === 'all' ? 'All users' : 'Specific users'}
              </label>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
            <Users size={14} />
            <strong>{formatNumber(selectedCount)}</strong> selected
          </span>
        </div>
        {audience === 'selected' && (
          <Controller
            control={control}
            name="userIds"
            render={({ field }) => <UserPicker value={field.value} onChange={field.onChange} />}
          />
        )}
      </Field>

      <Field label="Message" htmlFor="message" error={errors.message?.message} helperText="Keep push messages under 120 characters.">
        <textarea
          id="message"
          rows={4}
          placeholder="Write the notification text…"
          className={inputClass(!!errors.message)}
          {...register('message')}
        />
      </Field>

      <Field
        label="Scheduled time"
        htmlFor="scheduledAt"
        error={errors.scheduledAt?.message}
        helperText="A time in the past starts processing immediately."
      >
        <input
          id="scheduledAt"
          type="datetime-local"
          suppressHydrationWarning
          className={inputClass(!!errors.scheduledAt)}
          {...register('scheduledAt')}
        />
      </Field>

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
        <Link href="/campaigns" className={buttonStyles('secondary')}>
          Cancel
        </Link>
        <Button type="submit" isLoading={createCampaign.isPending}>
          Create campaign
        </Button>
      </div>
    </form>
  );
}
