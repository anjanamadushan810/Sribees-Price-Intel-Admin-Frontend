import { useQuery } from '@tanstack/react-query'
import { Alert, Card, Col, Row, Statistic } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Summary } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import BranchPicker from '../components/BranchPicker'
import PageHeader from '../components/PageHeader'

export default function Overview() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [branchId, setBranchId] = useState<string>()
  const summary = useQuery({
    queryKey: ['summary', branchId],
    queryFn: async () => (await api.get<Summary>('/reports/summary', { params: { branch_id: branchId } })).data,
    enabled: !!branchId,
  })
  const s = summary.data
  const tile = (title: string, value: number | undefined, to: string, color?: string) => (
    <Col xs={12} md={6}>
      <Card hoverable onClick={() => navigate(to)}>
        <Statistic title={title} value={value ?? '—'} valueStyle={color ? { color } : undefined} />
      </Card>
    </Col>
  )

  return (
    <>
      <PageHeader title="Overview" subtitle="Where our prices stand against the market today"
        extra={<BranchPicker value={branchId} onChange={setBranchId} />} />
      {!!s?.sources_down.length && (
        <Alert style={{ marginBottom: 16 }} type="warning" showIcon
          message={`Not reading right now: ${s.sources_down.join(', ')}`}
          description="Their prices are getting older. See Sources for the reason."
          action={can('competitors.read') ? <a onClick={() => navigate('/sources')}>Open</a> : undefined} />
      )}
      <Row gutter={[16, 16]}>
        {tile('We are dearer', s?.dearer, '/products?position=dearer', '#cf1322')}
        {tile('Same price', s?.equal, '/products?position=equal')}
        {tile('We are cheaper', s?.cheaper, '/products?position=cheaper', '#389e0d')}
        {tile('No competitor price yet', s?.unknown, '/products?position=unknown')}
        {can('suggestions.read') && tile('Suggestions waiting', s?.pending_suggestions, '/suggestions')}
        {tile('Cost price missing', s?.cost_missing, '/products?cost_missing=1')}
        {can('matches.read') && tile('Matches to check', s?.match_queue, '/matches')}
        {tile('Products tracked', s?.tracked, '/products')}
      </Row>
    </>
  )
}
