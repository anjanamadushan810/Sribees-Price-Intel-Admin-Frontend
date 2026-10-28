import { Select } from 'antd'
import { useEffect } from 'react'
import { useBranches } from '../api/lookups'

/** The branch whose prices are shown. The server lists the branch stocking the most
 *  products first, so the default is the one that sells online, never a fixed name. */
export default function BranchPicker({ value, onChange }: {
  value: string | undefined
  onChange: (branchId: string) => void
}) {
  const branches = useBranches()
  const list = (branches.data ?? []).filter((b) => b.is_active)
  useEffect(() => {
    if (!value && list.length) onChange(list[0].branch_id)
  }, [value, list, onChange])
  if (list.length <= 1) return null
  return (
    <Select style={{ width: 240 }} value={value} onChange={onChange}
      options={list.map((b) => ({
        value: b.branch_id,
        label: `${b.name} · ${b.products} products`,
        disabled: b.products === 0 && b.branch_id !== value,
      }))} />
  )
}
