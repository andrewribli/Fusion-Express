import { WHY_GRACERUN } from "@/lib/constants";

export function WhyGraceRun() {
  return (
    <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-gray-900">
        Why GraceRun instead of Foodpanda
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        Built for CUHK halls, not city-wide courier drop-off.
      </p>
      <ul className="mt-3 space-y-3">
        {WHY_GRACERUN.map((item) => (
          <li key={item.title}>
            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
