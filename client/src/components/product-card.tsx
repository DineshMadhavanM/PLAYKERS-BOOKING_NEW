import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/cart", {
        productId: product.id,
        quantity: 1,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product added to cart!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add product to cart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const displayPrice = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
  const originalPrice = product.discountPrice ? Number(product.price) : null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-product-${product.id}`}>
      {product.images && product.images.length > 0 && (
        <img 
          src={product.images[0]} 
          alt={product.name} 
          className="w-full h-48 object-cover"
          data-testid={`img-product-${product.id}`}
        />
      )}
      <CardContent className="p-4">
        <h3 className="font-semibold mb-2" data-testid={`text-product-name-${product.id}`}>
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm mb-3" data-testid={`text-product-description-${product.id}`}>
          {product.description || product.brand}
        </p>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-lg font-bold text-primary" data-testid={`text-product-price-${product.id}`}>
              ₹{displayPrice.toLocaleString()}
            </span>
            {originalPrice && (
              <span className="text-sm text-muted-foreground line-through ml-2">
                ₹{originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          <Button 
            size="sm"
            onClick={() => addToCartMutation.mutate()}
            disabled={addToCartMutation.isPending || !product.inStock}
            data-testid={`button-add-to-cart-${product.id}`}
          >
            {addToCartMutation.isPending ? "Adding..." : product.inStock ? "Add to Cart" : "Out of Stock"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
