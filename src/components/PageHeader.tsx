import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Space, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PageHeader(props: {
  title: ReactNode
  subtitle?: ReactNode
  extra?: ReactNode
  back?: string
}) {
  const navigate = useNavigate()
  return (
    <div className="page-header">
      <Space align="start">
        {props.back && (
          <Button type="text" icon={<ArrowLeftOutlined />} aria-label="Back"
            onClick={() => navigate(props.back!)} />
        )}
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>{props.title}</Typography.Title>
          {props.subtitle && <Typography.Text type="secondary">{props.subtitle}</Typography.Text>}
        </div>
      </Space>
      {props.extra && <div>{props.extra}</div>}
    </div>
  )
}
