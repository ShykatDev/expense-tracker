import { ImageResponse } from "next/og"

export const dynamicParams = false

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }]
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params
  const dimension = Number(size) || 512
  const border = Math.max(4, Math.round(dimension * 0.035))

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0a0a0a",
        }}
      >
        <div
          style={{
            margin: "auto",
            width: "58%",
            height: "58%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "20%",
            border: `${border}px solid white`,
          }}
        >
          <div
            style={{
              width: "34%",
              height: "34%",
              borderRadius: "9999px",
              background: "white",
            }}
          />
        </div>
      </div>
    ),
    { width: dimension, height: dimension },
  )
}
