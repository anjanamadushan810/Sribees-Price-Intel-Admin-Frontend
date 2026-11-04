import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Select, Space, Tag, Tooltip, Typography } from 'antd'
import { api, errorMessage } from '../api/client'
import { formatMoney } from '../api/money'
import type { Item } from '../api/types'

/** "100 g", "1 kg", "500 ml", "1 l" from base units; no amount = priced per 1 kg / 1 l. */
export function formatAmount(value: string | null, unit: string | null): string {
  if (!value) return unit === 'ml' ? '1 l' : '1 kg'
  const v = Number(value)
  const big = unit === 'ml' ? 'l' : 'kg'
  return v >= 1000 && v % 100 === 0 ? `${v / 1000} ${big}` : `${v} ${unit ?? 'g'}`
}

const AMOUNTS = ['100', '250', '500', '1000']

/**
 * A shop item sold loose (owner 2026-11-04): its price is for an amount (Nexmart
 * "Green Gram - Bulk" Rs 97.50 per 100 g), shown beside the same price at our pack size.
 * Nexmart labels many 1 kg prices "per 100 g", so a person may set the amount here; the
 * nightly run keeps their choice.
 */
export default function BulkPrice({
  item,
  comparePrice,
  canEdit,
}: {
  item: Item
  comparePrice: string | null | undefined
  canEdit: boolean
}) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const unit = item.size_unit ?? 'g'

  const setAmount = useMutation({
    mutationFn: (size: string) =>
      api.put(`/items/${item.item_id}/price-for`, { size_value: size, size_unit: unit }),
    onSuccess: () => {
      message.success('Saved. Their price is now compared for that amount.')
      for (const key of ['match-queue', 'products', 'product', 'summary']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
    onError: (e) => message.error(errorMessage(e)),
  })

  const current = item.size_value ? String(Number(item.size_value)) : '1000'
  const options = Array.from(new Set([...AMOUNTS, current]))
    .sort((a, b) => Number(a) - Number(b))
    .map((v) => ({ value: v, label: `per ${formatAmount(v, unit)}` }))

  return (
    <Space size={6} wrap>
      <Tooltip title="Sold loose (bulk): their price is for an amount, not a pack">
        <Tag color="geekblue" style={{ marginInlineEnd: 0 }}>Bulk</Tag>
      </Tooltip>
      <strong className="num" style={{ fontSize: 14, color: '#0F172A' }}>
        Rs {item.last_price ? formatMoney(item.last_price) : '—'}
      </strong>
      {canEdit ? (
        <Tooltip
          title={item.price_for_by
            ? 'Set by hand; the daily run keeps it'
            : "Read from the shop's label. Wrong? Pick the amount their price is really for."}
        >
          <Select
            size="small"
            value={current}
            options={options}
            loading={setAmount.isPending}
            onChange={(v) => setAmount.mutate(v)}
            style={{ width: 118 }}
            popupMatchSelectWidth={false}
          />
        </Tooltip>
      ) : (
        <span style={{ fontSize: 12, color: '#64748B' }}>/ {formatAmount(item.size_value, item.size_unit)}</span>
      )}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {comparePrice
          ? <>= <strong className="num" style={{ color: '#0F172A' }}>Rs {formatMoney(comparePrice)}</strong> for our pack</>
          : 'cannot compare with our pack size'}
      </Typography.Text>
    </Space>
  )
}
