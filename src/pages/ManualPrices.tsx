import {
  EditOutlined,
  SearchOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Select,
  Switch,
} from 'antd'
import { useState } from 'react'
import { api, errorMessage } from '../api/client'
import { useCompetitors } from '../api/lookups'
import { isValidAmount } from '../api/money'
import type { ProductPage } from '../api/types'
import PageHeader from '../components/PageHeader'

/** Shelf prices from physical stores without websites (Glomark manual, Laugfs, local shops). */
export default function ManualPrices() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [search, setSearch] = useState('')
  const competitors = useCompetitors()

  const products = useQuery({
    queryKey: ['product-search', search],
    queryFn: async () =>
      (await api.get<ProductPage>('/products', { params: { q: search || undefined, limit: 30 } })).data,
    enabled: search.length >= 2,
  })

  const save = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      api.post('/observations/manual', {
        competitor_id: v.competitor_id,
        product_id: v.product_id,
        price: String(v.price).trim().replace(/,/g, ''),
        mrp: v.mrp ? String(v.mrp).trim().replace(/,/g, '') : null,
        in_stock: v.in_stock !== false,
        note: v.note || null,
      }),
    onSuccess: () => {
      message.success('Shelf price saved and linked to catalog successfully')
      form.resetFields(['product_id', 'price', 'mrp', 'note'])
    },
  })

  const money = (required: boolean) => [
    {
      validator: (_: unknown, v: string) =>
        (!v && !required) || (v && isValidAmount(v))
          ? Promise.resolve()
          : Promise.reject(new Error('Please enter a valid rupee amount, e.g. 450 or 449.50')),
    },
  ]

  return (
    <>
      <PageHeader
        title="Store Shelf Prices"
        subtitle="Log observed in-store retail prices from local physical shops and supermarkets without automated scrapers"
      />

      <Card
        style={{
          maxWidth: 620,
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
        }}
        title={
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            <EditOutlined style={{ marginRight: 8, color: '#E11D48' }} />
            New Price Observation
          </span>
        }
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={save.mutate}
          initialValues={{ in_stock: true }}
        >
          <Form.Item
            name="competitor_id"
            label="Competitor / Local Shop"
            rules={[{ required: true, message: 'Please select the store where you observed this price' }]}
          >
            <Select
              placeholder="Select store (e.g. Laugfs Super, Local Shop)"
              options={(competitors.data ?? [])
                .filter((c) => c.kind === 'manual')
                .map((c) => ({
                  value: c.competitor_id,
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShopOutlined style={{ color: '#E11D48' }} /> {c.name}
                    </span>
                  ),
                }))}
            />
          </Form.Item>

          <Form.Item
            name="product_id"
            label="Sribees Catalog Product"
            rules={[{ required: true, message: 'Please search and select the corresponding Sribees item' }]}
            extra="Type at least 2 characters to search by brand or product title"
          >
            <Select
              showSearch
              filterOption={false}
              onSearch={setSearch}
              placeholder="Type 2+ letters to search (e.g. 'Munchee', 'Anchor')..."
              loading={products.isFetching}
              notFoundContent={search.length < 2 ? null : undefined}
              suffixIcon={<SearchOutlined style={{ color: '#94a3b8' }} />}
              options={(products.data?.items ?? []).map((p) => ({
                value: p.product_id,
                label: p.name,
              }))}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="price"
              label="Selling Price on Shelf"
              rules={money(true)}
            >
              <Input
                addonBefore="Rs"
                placeholder="450.00"
                inputMode="decimal"
                className="num"
              />
            </Form.Item>

            <Form.Item
              name="mrp"
              label="Printed Pack MRP (Optional)"
              rules={money(false)}
            >
              <Input
                addonBefore="Rs"
                placeholder="500.00"
                inputMode="decimal"
                className="num"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="in_stock"
            label="Stock Availability on Shelf"
            valuePropName="checked"
            extra="Switch off if the shelf was empty / out of stock at the time of your store visit"
          >
            <Switch
              checkedChildren="In Stock"
              unCheckedChildren="Out of Stock"
              defaultChecked
            />
          </Form.Item>

          <Form.Item
            name="note"
            label="Observation Notes (Optional)"
            rules={[{ max: 300 }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="e.g. Store branch location, special promotional offer, damaged packaging..."
            />
          </Form.Item>

          {save.error && (
            <Alert
              style={{ marginBottom: 16 }}
              type="error"
              showIcon
              message={errorMessage(save.error)}
            />
          )}

          <Button
            type="primary"
            htmlType="submit"
            loading={save.isPending}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              background: '#E11D48',
              borderColor: '#E11D48',
            }}
          >
            Save Shelf Price
          </Button>
        </Form>
      </Card>
    </>
  )
}
