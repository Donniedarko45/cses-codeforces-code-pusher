import type { PropsWithChildren } from 'react'

interface CardProps extends PropsWithChildren {
  title: string
}

export const Card = ({ title, children }: CardProps) => (
  <section className="card">
    <h3>{title}</h3>
    <div>{children}</div>
  </section>
)
