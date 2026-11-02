import {
  CalendarOutlined,
  CheckCircleOutlined,
  PercentageOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  Row,
  Slider,
  Space,
  Typography,
} from 'antd'
import { useState } from 'react'
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
  const [form] = Form.useForm()
  const [margin, setMargin] = useState<number>(5.0)

  const settings = useQuery({
    queryKey: ['pricing-settings'],
    queryFn: async () => {
      const data = (await api.get<PricingSettings>('/settings/pricing')).data
      setMargin(Number(data.min_margin_pct))
      return data
    },
  })

  const save = useMutation({
    mutationFn: (v: PricingSettings) => api.put('/settings/pricing', v),
    onSuccess: () => {
      message.success('Price rules saved. Suggestions will recalculate with these parameters.')
      queryClient.invalidateQueries({ queryKey: ['pricing-settings'] })
    },
  })

  return (
    <>
      <PageHeader
        title="Price Decision Rules"
        subtitle="Configure the dynamic repricing logic, minimum profit margin floor, and competitor data freshness limits"
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card
            style={{ borderRadius: 16 }}
            loading={settings.isLoading}
            title={
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                <SafetyCertificateOutlined style={{ marginRight: 8, color: '#E11D48' }} />
                Protected Profit Margin Floor
              </span>
            }
          >
            {settings.data && (
              <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                disabled={!writable}
                initialValues={{
                  ...settings.data,
                  min_margin_pct: Number(settings.data.min_margin_pct),
                }}
                onFinish={(v) => save.mutate(v as PricingSettings)}
              >
                <div style={{ marginBottom: 20 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    The repricing engine matches the lowest competitor in the market, but will <strong>never drop prices below cost + this minimum margin</strong>.
                  </Typography.Text>
                </div>

                <Form.Item
                  name="min_margin_pct"
                  label={
                    <span style={{ fontWeight: 600 }}>
                      <PercentageOutlined style={{ marginRight: 4, color: '#E11D48' }} />
                      Minimum Margin Over Cost (%)
                    </span>
                  }
                  rules={[{ required: true }]}
                >
                  <Row gutter={16} align="middle">
                    <Col xs={16}>
                      <Slider
                        min={0}
                        max={30}
                        step={0.5}
                        value={margin}
                        onChange={(val) => {
                          setMargin(val)
                          form.setFieldValue('min_margin_pct', val)
                        }}
                      />
                    </Col>
                    <Col xs={8}>
                      <InputNumber
                        min={0}
                        max={100}
                        step={0.5}
                        addonAfter="%"
                        value={margin}
                        onChange={(val) => {
                          if (val !== null) {
                            setMargin(val)
                            form.setFieldValue('min_margin_pct', val)
                          }
                        }}
                        style={{ width: '100%' }}
                      />
                    </Col>
                  </Row>
                </Form.Item>

                {/* Visual Formula Explainer */}
                <div
                  style={{
                    background: '#F8FAFC',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    marginBottom: 24,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Example calculation:</div>
                  <div style={{ fontSize: 14, color: '#0F172A', marginTop: 4 }}>
                    If an item costs <strong className="num">Rs 1,000.00</strong>, the lowest allowable price suggestion will be{' '}
                    <strong className="num" style={{ color: '#059669' }}>
                      Rs {(1000 * (1 + margin / 100)).toFixed(2)}
                    </strong>{' '}
                    (+{margin}% margin protected).
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '20px 0 10px 0' }}>
                  <CalendarOutlined style={{ color: '#E11D48' }} />
                  <Typography.Title level={5} style={{ margin: 0, fontSize: 14 }}>
                    Data Freshness Window (Expiry per Review Cadence)
                  </Typography.Title>
                </div>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 16 }}>
                  Competitor prices older than these days are considered expired and will not drive repricing suggestions:
                </Typography.Paragraph>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                  {(['daily', 'weekly', 'monthly', 'long'] as const).map((level) => (
                    <Form.Item
                      key={level}
                      name={['stale_days', level]}
                      label={<span style={{ fontWeight: 500 }}>{LEVEL_LABEL[level]}</span>}
                      rules={[{ required: true }]}
                      style={{ marginBottom: 8 }}
                    >
                      <InputNumber
                        min={1}
                        max={365}
                        addonAfter="days"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  ))}
                </div>

                {save.error && (
                  <Alert style={{ marginBottom: 16 }} type="error" showIcon message={errorMessage(save.error)} />
                )}

                {writable && (
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={save.isPending}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      fontWeight: 600,
                      background: '#E11D48',
                      borderColor: '#E11D48',
                      padding: '0 24px',
                    }}
                  >
                    Save Price Rules
                  </Button>
                )}
              </Form>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            style={{ borderRadius: 16, background: '#ffffff' }}
            title={<span style={{ fontSize: 14, fontWeight: 600 }}>Rule Enforcement Guarantee</span>}
          >
            <Space direction="vertical" size="middle">
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircleOutlined style={{ color: '#059669', fontSize: 16, marginTop: 3 }} />
                <div>
                  <strong style={{ fontSize: 13, color: '#0F172A' }}>Never suggests a price increase</strong>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    The system only acts when competitors undercut our retail price.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircleOutlined style={{ color: '#059669', fontSize: 16, marginTop: 3 }} />
                <div>
                  <strong style={{ fontSize: 13, color: '#0F172A' }}>Never suggests without cost price</strong>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    If a branch manager hasn't entered purchase cost, the product is safely skipped.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <CheckCircleOutlined style={{ color: '#059669', fontSize: 16, marginTop: 3 }} />
                <div>
                  <strong style={{ fontSize: 13, color: '#0F172A' }}>Database-level Constraint</strong>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    Even if software fails, PostgreSQL triggers reject any price below the calculated floor.
                  </div>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </>
  )
}
