/**
 * 登录页面 - UI 风格与 EcoPaste 一致
 */

import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message, Tabs } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { setToken, setUser } from "@/stores/auth";
import type { LoginRequest, RegisterRequest } from "@/types/auth";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // 登录
  const handleLogin = async (values: LoginRequest) => {
    try {
      setLoading(true);
      const tokenData = await authApi.login(values);
      setToken(tokenData.access_token);

      // 获取用户信息
      const user = await authApi.getCurrentUser(tokenData.access_token);
      setUser(user);

      message.success("登录成功");
      navigate("/clipboard");
    } catch (error: any) {
      message.error(error.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async (values: RegisterRequest) => {
    try {
      setLoading(true);
      await authApi.register(values);
      message.success("注册成功，请登录");
      setActiveTab("login");
    } catch (error: any) {
      message.error(error.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-color-2">
      <Card bordered={false} className="w-full max-w-400px shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="mb-2 font-bold text-3xl text-color-1">EcoPaste</h1>
          <p className="text-color-2">剪贴板同步工具</p>
        </div>

        <Tabs
          activeKey={activeTab}
          centered
          items={[
            {
              children: (
                <Form
                  autoComplete="off"
                  name="login"
                  onFinish={handleLogin}
                  size="large"
                >
                  <Form.Item
                    name="username"
                    rules={[{ message: "请输入用户名", required: true }]}
                  >
                    <Input
                      placeholder="用户名"
                      prefix={<UserOutlined className="text-color-3" />}
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[{ message: "请输入密码", required: true }]}
                  >
                    <Input.Password
                      placeholder="密码"
                      prefix={<LockOutlined className="text-color-3" />}
                    />
                  </Form.Item>

                  <Form.Item className="mb-0">
                    <Button
                      block
                      htmlType="submit"
                      loading={loading}
                      size="large"
                      type="primary"
                    >
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
              key: "login",
              label: "登录",
            },
            {
              children: (
                <Form
                  autoComplete="off"
                  name="register"
                  onFinish={handleRegister}
                  size="large"
                >
                  <Form.Item
                    name="username"
                    rules={[
                      { message: "请输入用户名", required: true },
                      { message: "用户名至少3个字符", min: 3 },
                    ]}
                  >
                    <Input
                      placeholder="用户名"
                      prefix={<UserOutlined className="text-color-3" />}
                    />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    rules={[{ message: "请输入有效的邮箱地址", type: "email" }]}
                  >
                    <Input
                      placeholder="邮箱（可选）"
                      prefix={<MailOutlined className="text-color-3" />}
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[
                      { message: "请输入密码", required: true },
                      { message: "密码至少6个字符", min: 6 },
                    ]}
                  >
                    <Input.Password
                      placeholder="密码"
                      prefix={<LockOutlined className="text-color-3" />}
                    />
                  </Form.Item>

                  <Form.Item
                    dependencies={["password"]}
                    name="confirm"
                    rules={[
                      { message: "请确认密码", required: true },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("两次密码不一致"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      placeholder="确认密码"
                      prefix={<LockOutlined className="text-color-3" />}
                    />
                  </Form.Item>

                  <Form.Item className="mb-0">
                    <Button
                      block
                      htmlType="submit"
                      loading={loading}
                      size="large"
                      type="primary"
                    >
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
              key: "register",
              label: "注册",
            },
          ]}
          onChange={setActiveTab}
        />
      </Card>
    </div>
  );
};

export default Login;
