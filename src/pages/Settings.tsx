import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Card, Form, InputNumber, Typography } from 'antd'
import { api, errorMessage } from '../api/client'
import { LEVEL_LABEL } from '../api/lookups'
import type { PricingSettings } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../components/PageHeader'

export default function Settings() {
  const { can } = useAuth()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const writable = can('settings.write')
  const settings = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: async () => (await api.get<PricingSettings>('/settings/pricing')).data,
  })
  const save = useMutation({
    mutationFn: (v: PricingSettings) => api.put('/settings/pricing', v),
    onSuccess: () => {
      message.success('Saved. Suggestions follow the new rule on the next run.')
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] })
    },
  })

  return (
    <>
      <PageHeader title="Price rule" subtitle="Match the cheapest shop, but never below cost + this margin" />
      <Card style={{ maxWidth: 560 }} loading={settings.isLoading}>
        {settings.data && (
          <Form layout="vertical" requiredMark={false} disabled={!writable}
            initialValues={{ ...settings.data, min_margin_pct: Number(settings.data.min_margin_pct) }}
            onFinish={(v) => save.mutate(v as PricingSettings)}>
            <Form.Item name="min_margin_pct" label="Lowest margin over cost (%)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} step={0.5} style={{ width: 160 }} />
            </Form.Item>
            <Typography.Paragraph type="secondary">
              A competitor price older than this many days does not count:
            </Typography.Paragraph>
            {(['daily', 'weekly', 'monthly', 'long'] as const).map((level) => (
              <Form.Item key={level} name={['stale_days', level]} label={LEVEL_LABEL[level]} rules={[{ required: true }]}>
                <InputNumber min={1} max={365} addonAfter="days" style={{ width: 200 }} />
              </Form.Item>
            ))}
            {save.error && <Alert style={{ marginBottom: 12 }} type="error" showIcon message={errorMessage(save.error)} />}
            {writable && <Button type="primary" htmlType="submit" loading={save.isPending}>Save</Button>}
          </Form>
        )}
      </Card>
    </>
  )
}
