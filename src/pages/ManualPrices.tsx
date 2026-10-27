import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, App, Button, Card, Form, Input, Select, Switch } from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { useCompetitors } from '../api/lookups'
import { isValidAmount } from '../api/money'
import type { ProductPage } from '../api/types'
import PageHeader from '../components/PageHeader'

/** Shelf prices from shops the system cannot read (Glomark, Laugfs, local shops). */
export default function ManualPrices() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [search, setSearch] = useState('')
  const competitors = useCompetitors()
  const products = useQuery({
    queryKey: ['product-search', search],
    queryFn: async () => (await api.get<ProductPage>('/products', { params: { q: search || undefined, limit: 30 } })).data,
    enabled: search.length >= 2,
  })

  const save = useMutation({
    mutationFn: (v: Record<string, unknown>) => api.post('/observations/manual', {
      competitor_id: v.competitor_id,
      product_id: v.product_id,
      price: String(v.price).trim().replace(/,/g, ''),
      mrp: v.mrp ? String(v.mrp).trim().replace(/,/g, '') : null,
      in_stock: v.in_stock !== false,
      note: v.note || null,
    }),
    onSuccess: () => {
      message.success('Saved')
      form.resetFields(['product_id', 'price', 'mrp', 'note'])
    },
  })

  const money = (required: boolean) => [{
    validator: (_: unknown, v: string) => (!v && !required) || (v && isValidAmount(v))
      ? Promise.resolve() : Promise.reject(new Error('Rupees, e.g. 450 or 449.50')),
  }]

  return (
    <>
      <PageHeader title="Shelf prices" subtitle="Prices seen in shops without a website. One entry per product per visit." />
      <Card style={{ maxWidth: 560 }}>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={save.mutate} initialValues={{ in_stock: true }}>
          <Form.Item name="competitor_id" label="Shop" rules={[{ required: true }]}>
            <Select options={(competitors.data ?? []).filter((c) => c.kind === 'manual')
              .map((c) => ({ value: c.competitor_id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="product_id" label="Our product" rules={[{ required: true }]}>
            <Select showSearch filterOption={false} onSearch={setSearch} placeholder="Type 2+ letters"
              loading={products.isFetching} notFoundContent={search.length < 2 ? null : undefined}
              options={(products.data?.items ?? []).map((p) => ({ value: p.product_id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="price" label="Price they charge (Rs)" rules={money(true)}>
            <Input inputMode="decimal" />
          </Form.Item>
          <Form.Item name="mrp" label="MRP on the pack (optional)" rules={money(false)}>
            <Input inputMode="decimal" />
          </Form.Item>
          <Form.Item name="in_stock" label="On the shelf" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="note" label="Note (which shop, offer…)" rules={[{ max: 300 }]}>
            <Input />
          </Form.Item>
          {save.error && <Alert style={{ marginBottom: 12 }} type="error" showIcon message={errorMessage(save.error)} />}
          <Button type="primary" htmlType="submit" loading={save.isPending}>Save price</Button>
        </Form>
      </Card>
    </>
  )
}
