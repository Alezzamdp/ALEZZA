// Gestión usa el tema de BRUNO OS (invertido desde su versión oscura, ver globals.css).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="tema-admin flex flex-1 flex-col">{children}</div>;
}
