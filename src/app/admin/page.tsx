import { redirect } from "next/navigation";

// Oportunidades se sacó: /admin lleva al stock.
export default function Admin() {
  redirect("/admin/vehiculos");
}
