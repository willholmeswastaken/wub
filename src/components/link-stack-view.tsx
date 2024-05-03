'use client';

import ShortLink from "./short-link";

export default function LinkStackView() {
    return (
        <div>
            <ShortLink
                url="https://drizzle.team"
                clicks={100}
            />
        </div>
    )
}