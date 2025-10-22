import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrdersWithSignedUrls } from "@/lib/data/orders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Package, Eye, Calendar, CreditCard, Truck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

/**
 * Orders Page - Liste complète des commandes avec historique
 */
export default async function OrdersPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const orders = await getOrdersWithSignedUrls(session.user.id);

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">Mes Commandes</h1>
        <p className="text-slate-400 text-sm">
          Historique complet de vos commandes et leur statut
        </p>
      </div>

      {orders.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/70">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 mb-1">Aucune commande pour le moment</p>
            <p className="text-slate-500 text-sm mb-4">
              Vos commandes apparaîtront ici une fois que vous aurez finalisé un achat
            </p>
            <Link href="/studio">
              <Button>Créer un projet</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const productData = order.product as any;
            const previewImage = order.project?.outputs?.[0]?.url;

            return (
              <Card key={order.id} className="border-slate-800 bg-slate-900/70 hover:bg-slate-900/90 transition-colors">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image du produit */}
                    <div className="flex-shrink-0">
                      {previewImage ? (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-800">
                          <Image
                            src={previewImage}
                            alt="Product preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-slate-800 flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                    </div>

                    {/* Informations de la commande */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-white truncate">
                            #{order.id.slice(-8).toUpperCase()}
                          </h3>
                          <p className="text-sm text-slate-400 truncate">
                            {productData?.productName || 'Produit personnalisé'}
                          </p>
                        </div>
                        <OrderStatusBadge status={order.status as any} />
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit'
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span className="font-semibold text-white">
                            {(order.price / 100).toFixed(2)} {order.currency.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Truck className="w-3.5 h-3.5" />
                          <span className="capitalize">{order.provider.toLowerCase()}</span>
                        </div>

                        <div className="flex items-center justify-end">
                          <Button 
                            href={`/dashboard/orders/${order.id}`}
                            variant="ghost" 
                            className="h-7 px-3 text-xs border border-slate-700 hover:bg-slate-800"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Détails
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
