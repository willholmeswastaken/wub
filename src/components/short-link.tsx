import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ShortLink({ url, clicks }: { url: string, clicks: number }) {
    // make it animate in
    // add copy button
    // make clicks look cool with icon graph
    // add a default favicon
    return (
        <Card>
            <CardHeader className="items-start p-3">
                <CardTitle>{url}</CardTitle>
                <CardDescription>{url} {clicks}</CardDescription>
            </CardHeader>
        </Card>
    )
}