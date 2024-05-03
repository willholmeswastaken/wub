import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ShortLink({ url, clicks }: { url: string, clicks: number }) {
    return (
        <Card>
            <CardHeader className="items-start p-3">
                <CardTitle>{url}</CardTitle>
                <CardDescription>{url} {clicks}</CardDescription>
            </CardHeader>
        </Card>
    )
}