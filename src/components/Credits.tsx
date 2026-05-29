const TEAM = "Gestión de Comercios";

const PEOPLE = [
  { name: "Sandra Lara", role: "Product Owner" },
  { name: "Tania Del Milagro Guizado", role: "Business Specialist" },
  { name: "Miguel Vega", role: "Tech Lead" },
];

export default function Credits() {
  return (
    <footer className="mt-12 rounded-2xl border border-gray-200 bg-white px-6 py-5 text-xs text-gray-600">
      <p className="font-semibold uppercase tracking-widest text-culqi-primary/70">
        {TEAM}
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {PEOPLE.map((p) => (
          <li key={p.name} className="leading-tight">
            <span className="block font-semibold text-culqi-primary">
              {p.name}
            </span>
            <span className="block text-gray-500">{p.role}</span>
          </li>
        ))}
      </ul>
    </footer>
  );
}
