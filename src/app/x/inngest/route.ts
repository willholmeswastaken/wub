export async function GET(
    request: Request,
    { params }: { params: { code: string } }
) {
    return new Response('Hello, Next.js!', {
        status: 200,
    })
}