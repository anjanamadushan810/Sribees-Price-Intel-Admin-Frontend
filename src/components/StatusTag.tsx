import { Tag } from 'antd'
import { STATUS_COLOR, statusLabel } from '../api/lookups'

export default function StatusTag({ status }: { status: string | null | undefined }) {
  if (!status) return null
  return <Tag color={STATUS_COLOR[status] ?? 'default'}>{statusLabel(status)}</Tag>
}
