import { getProductCategories } from "./actions";
import ProductCategoryTable from "./ProductCategoryTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductCategoryPage() {
  const categories = await getProductCategories();

  return (
    <div style={{ width: "100%" }}>
      <ProductCategoryTable initialCategories={categories as any} />
    </div>
  );
}
