import { LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, QRCode, Space, Steps, Typography } from 'antd'
import { useState } from 'react'
import { errorMessage } from '../api/client'
import type { Step } from '../api/types'
import { useAuth } from './AuthContext'

type Stage =
  | { kind: 'password' }
  | { kind: 'code'; ticket: string }
  | { kind: 'setup'; ticket: string; secret?: string; uri?: string }

export default function LoginPage() {
  const auth = useAuth()
  const [stage, setStage] = useState<Stage>({ kind: 'password' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const onPassword = (v: { email: string; password: string }) =>
    run(async () => {
      const result = await auth.login(v.email, v.password)
      if (result.done) return
      const step: Step = result.step
      if (step.status === 'totp_required') {
        setStage({ kind: 'code', ticket: step.ticket })
      } else {
        const setup = await auth.startTotpSetup(step.ticket)
        setStage({ kind: 'setup', ticket: step.ticket, secret: setup.secret, uri: setup.otpauth_uri })
      }
    })

  return (
    <div className="login-page">
      <Card className="login-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Sribees Price Intel
            </Typography.Title>
            <Typography.Text type="secondary">Competitor prices and price suggestions</Typography.Text>
          </div>

          {error && <Alert type="error" showIcon message={error} />}

          {stage.kind === 'password' && (
            <Form layout="vertical" onFinish={onPassword} requiredMark={false}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input prefix={<MailOutlined />} autoComplete="username" autoFocus />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={busy}>
                Continue
              </Button>
            </Form>
          )}

          {stage.kind === 'code' && (
            <CodeForm
              busy={busy}
              label="Enter the 6-digit code from your authenticator app"
              onSubmit={(code) => run(() => auth.verifyTotp(stage.ticket, code))}
              onBack={() => setStage({ kind: 'password' })}
            />
          )}

          {stage.kind === 'setup' && (
            <>
              <Steps
                size="small"
                current={1}
                items={[{ title: 'Password' }, { title: 'Set up 2FA' }, { title: 'Done' }]}
              />
              <Typography.Paragraph>
                Two-step sign-in is required. Scan this code with Google Authenticator,
                Microsoft Authenticator or a similar app, then enter the code it shows.
              </Typography.Paragraph>
              {stage.uri && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <QRCode value={stage.uri} size={180} />
                </div>
              )}
              <Typography.Text type="secondary">
                Can't scan? Enter this key: <Typography.Text code copyable>{stage.secret}</Typography.Text>
              </Typography.Text>
              <CodeForm
                busy={busy}
                label="Code from the app"
                onSubmit={(code) => run(() => auth.enableTotp(stage.ticket, code))}
                onBack={() => setStage({ kind: 'password' })}
              />
            </>
          )}
        </Space>
      </Card>
    </div>
  )
}

function CodeForm(props: {
  busy: boolean
  label: string
  onSubmit: (code: string) => void
  onBack: () => void
}) {
  return (
    <Form layout="vertical" onFinish={(v: { code: string }) => props.onSubmit(v.code)} requiredMark={false}>
      <Form.Item
        name="code"
        label={props.label}
        rules={[{ required: true, pattern: /^\d{6}$/, message: 'Six digits' }]}
      >
        <Input
          prefix={<SafetyOutlined />}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
        />
      </Form.Item>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button onClick={props.onBack}>Back</Button>
        <Button type="primary" htmlType="submit" loading={props.busy}>
          Verify
        </Button>
      </Space>
    </Form>
  )
}
