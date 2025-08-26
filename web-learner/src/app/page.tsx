// src/app/page.tsx
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* 顶部操作区域 */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Overview</h2>
        <Button>+ New Project</Button>
      </div>

      {/* 学习平台卡片 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>🚀 CodePath 学习平台</CardTitle>
          <CardDescription>
            交互式代码学习平台，支持 Python 和 JavaScript 学习
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              三栏式布局设计：左侧导航、中间内容、右侧AI助手
            </p>
            <div className="flex gap-2">
              <Link href="/learn">
                <Button>开始学习 Python</Button>
              </Link>
              <Link href="/learn">
                <Button variant="outline">JavaScript 教程</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片区域 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Projects</CardTitle>
            <CardDescription>All active and completed projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">124</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription>Projects currently in progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">12</p>
          </CardContent>
        </Card>
      </div>

      {/* 最近项目表格 */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>CodePath Learning Platform</TableCell>
                <TableCell>In Progress</TableCell>
                <TableCell>Just now</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Project Beta</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell>1 day ago</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}