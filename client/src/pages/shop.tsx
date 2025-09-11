import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import ProductCard from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

export default function Shop() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCart, setShowCart] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products", selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      if (searchTerm) params.set("search", searchTerm);
      
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ["/api/cart"],
    enabled: isAuthenticated,
  });

  const updateCartMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      await apiRequest("PUT", `/api/cart/${id}`, { quantity });
    },
    onSuccess: () => {
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
        description: "Failed to update cart item.",
        variant: "destructive",
      });
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cart/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item removed from cart",
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
        description: "Failed to remove item from cart.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const categories = ["cricket", "football", "volleyball", "tennis", "kabaddi"];
  
  const cartTotal = cartItems.reduce((total: number, item: any) => {
    const product = products.find((p: any) => p.id === item.productId);
    if (product) {
      const price = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
      return total + (price * item.quantity);
    }
    return total;
  }, 0);

  const handleSearch = () => {
    // Query will automatically refetch when dependencies change
  };

  return (
    <div className="min-h-screen bg-background" data-testid="shop-page">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Sports Equipment Store</h1>
          <Button 
            variant="outline" 
            onClick={() => setShowCart(!showCart)}
            className="relative"
            data-testid="button-toggle-cart"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Cart ({cartItems.length})
            {cartItems.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {cartItems.length}
              </Badge>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Filters */}
            <div className="mb-8 flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-products"
                />
              </div>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} data-testid="button-search-products">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p>Loading products...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-muted-foreground" data-testid="text-products-count">
                    {products.length} product{products.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                
                {products.length === 0 ? (
                  <div className="text-center py-12" data-testid="empty-products">
                    <div className="text-6xl mb-4">🏪</div>
                    <h3 className="text-xl font-semibold mb-2">No products found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search criteria or check back later for new products.
                    </p>
                    <Button onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("");
                    }} data-testid="button-clear-filters">
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product: any) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Shopping Cart Sidebar */}
          <div className={`lg:col-span-1 ${showCart ? 'block' : 'hidden lg:block'}`}>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Shopping Cart
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cartItems.length === 0 ? (
                  <div className="text-center py-8" data-testid="empty-cart">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item: any) => {
                      const product = products.find((p: any) => p.id === item.productId);
                      if (!product) return null;
                      
                      const price = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
                      
                      return (
                        <div key={item.id} className="border rounded-lg p-3" data-testid={`cart-item-${item.id}`}>
                          <div className="flex items-start gap-3">
                            {product.images && product.images[0] && (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{product.name}</h4>
                              <p className="text-primary font-semibold">
                                ₹{price.toLocaleString()}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateCartMutation.mutate({ 
                                    id: item.id, 
                                    quantity: Math.max(1, item.quantity - 1) 
                                  })}
                                  data-testid={`button-decrease-quantity-${item.id}`}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium">{item.quantity}</span>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateCartMutation.mutate({ 
                                    id: item.id, 
                                    quantity: item.quantity + 1 
                                  })}
                                  data-testid={`button-increase-quantity-${item.id}`}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => removeFromCartMutation.mutate(item.id)}
                                  data-testid={`button-remove-item-${item.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold">Total:</span>
                        <span className="text-xl font-bold text-primary" data-testid="text-cart-total">
                          ₹{cartTotal.toLocaleString()}
                        </span>
                      </div>
                      <Button className="w-full" data-testid="button-checkout">
                        Proceed to Checkout
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
