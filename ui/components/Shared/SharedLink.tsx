import classNames from "classnames"
import React, { ReactElement } from "react"

type Props = {
  url: string
  children?: React.ReactNode
  text?: string
  type?: "link" | "button" | "tooltip"
  styles?: React.CSSProperties & Record<string, string>
}

export default function SharedLink({
  text,
  children,
  url,
  styles = {},
  type = "link",
}: Props): ReactElement {
  return (
    <a
      style={styles}
      href={url}
      target="_blank"
      rel="noreferrer"
      className={classNames("link", {
        button: type === "button",
        tooltip: type === "tooltip",
      })}
    >
      {text ?? children}
      <style jsx>{`
        .link {
          color: var(--link-color, var(--trophy-gold));
        }
        .link:hover {
          color: var(--hover-color, var(--gold-40));
        }
        .button {
          padding: 4px;
          display: inline-block;
        }
        .link.tooltip {
          text-decoration: underline;
          color: var(--green-95);
          padding: 0px;
        }
        .link.tooltip:hover {
          color: var(--green-40);
        }
      `}</style>
    </a>
  )
}
