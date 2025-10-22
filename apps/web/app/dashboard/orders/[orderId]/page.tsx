import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@muzo/db/prisma-client";
import { getOrderWithSignedUrls } from "@/lib/data/orders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  OrderStatusBadge, 
  PaymentStatusBadge, 
  JobStatusBadge 
} from "@/components/order-status-badge";
import { 
  ArrowLeft, 
  Package, 
  MapPin, 
  CreditCard, 
  Truck, 
  Calendar,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Stripe } from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

/**
 * Order Detail Page - Détails complets d'une commande
 */
export default async function OrderDetailPage({
  params,
}: {
  params: { orderId: string };
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const order = await getOrderWithSignedUrls(params.orderId);

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  // Récupérer les détails Stripe
  let stripeSession = null;
  let stripePaymentIntent = null;
  
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(order.stripeSessionId, {
      expand: ['payment_intent', 'customer'],
    });
    
    if (stripeSession.payment_intent && typeof stripeSession.payment_intent !== 'string') {
      stripePaymentIntent = stripeSession.payment_intent;
    }
  } catch (error) {
    console.error('Error fetching Stripe session:', error);
  }

  // Récupérer le job de fulfillment
  const fulfillmentJob = await prisma.job.findFirst({
    where: {
      type: 'FULFILLMENT',
      projectId: order.projectId,
    },
    orderBy: { createdAt: 'desc' },
  });

  const productData = order.product as any;
  const previewImage = order.project?.outputs?.[0]?.url;

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/orders">
          <Button variant="ghost" className="mb-3 -ml-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux commandes
          </Button>
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Commande #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <OrderStatusBadge status={order.status as any} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-4">
          {/* Aperçu du produit */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="w-4 h-4" />
                Aperçu du produit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewImage ? (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-800">
                  <Image
                    src={previewImage}
                    alt="Product preview"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              ) : (
                <div className="w-full aspect-square rounded-lg bg-slate-800 flex items-center justify-center">
                  <Package className="w-12 h-12 text-slate-600" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Détails du produit */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-4 h-4" />
                Détails du produit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Produit</p>
                  <p className="text-white font-medium">
                    {productData?.productName || 'Produit personnalisé'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Quantité</p>
                  <p className="text-white font-medium">{productData?.quantity || 1}</p>
                </div>

                {productData?.productId && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 mb-1">ID Produit</p>
                    <p className="text-white font-mono text-xs">{productData.productId}</p>
                  </div>
                )}
              </div>

              {productData?.productOptions && Object.keys(productData.productOptions).length > 0 && (
                <>
                  <Separator className="bg-slate-800" />
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Options sélectionnées</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(productData.productOptions).map(([key, value]) => (
                        <div key={key} className="py-1.5 px-2 bg-slate-800/50 rounded text-xs">
                          <span className="text-slate-400 block">{key.replace('type_', '').replace(/_/g, ' ')}</span>
                          <span className="text-white font-medium">{String(value).replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator className="bg-slate-800" />

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Fournisseur</span>
                <Badge className="border-slate-700 bg-slate-800/50 text-slate-200">
                  {order.provider}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Informations Stripe */}
          {stripeSession && (
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-4 h-4" />
                  Paiement Stripe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Montant</span>
                    <span className="text-white font-semibold">
                      {(order.price / 100).toFixed(2)} {order.currency.toUpperCase()}
                    </span>
                  </div>

                  {stripePaymentIntent && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Statut</span>
                        <PaymentStatusBadge status={stripePaymentIntent.status} />
                      </div>

                      {(stripePaymentIntent as any).charges?.data?.[0]?.payment_method_details?.card && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Carte</span>
                          <span className="text-white">
                            •••• {(stripePaymentIntent as any).charges.data[0].payment_method_details.card.last4}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Separator className="bg-slate-800" />

                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-slate-500">Session: </span>
                    <span className="text-slate-400 font-mono break-all">{stripeSession.id}</span>
                  </div>
                  {stripePaymentIntent && (
                    <div>
                      <span className="text-slate-500">Payment: </span>
                      <span className="text-slate-400 font-mono break-all">{stripePaymentIntent.id}</span>
                    </div>
                  )}
                </div>

                {stripeSession.url && (
                  <a href={stripeSession.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" className="w-full border border-slate-700 text-xs h-8">
                      Voir dans Stripe
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Job de Fulfillment */}
          {fulfillmentJob && (
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="w-4 h-4" />
                  Traitement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Statut</span>
                  <JobStatusBadge status={fulfillmentJob.status as string} />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Tentatives</span>
                  <span className="text-white">
                    {fulfillmentJob.attempts} / {fulfillmentJob.maxAttempts}
                  </span>
                </div>

                {fulfillmentJob.lastError && (
                  <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs">
                    <p className="text-red-200 font-medium mb-1">Erreur</p>
                    <pre className="text-red-300 overflow-auto max-h-32">
                      {JSON.stringify(fulfillmentJob.lastError, null, 2)}
                    </pre>
                  </div>
                )}

                {fulfillmentJob.result && (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs">
                    <p className="text-emerald-200 font-medium mb-1">Résultat</p>
                    <pre className="text-emerald-300 overflow-auto max-h-32">
                      {JSON.stringify(fulfillmentJob.result, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Résumé */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2.5 text-slate-400">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <div className="text-xs">
                  <p className="text-white font-medium">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-slate-500">Date de commande</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-400">
                <CreditCard className="w-4 h-4 flex-shrink-0" />
                <div className="text-xs">
                  <p className="text-white font-medium">
                    {(order.price / 100).toFixed(2)} {order.currency.toUpperCase()}
                  </p>
                  <p className="text-slate-500">Total</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-400">
                <Truck className="w-4 h-4 flex-shrink-0" />
                <div className="text-xs">
                  <p className="text-white font-medium capitalize">
                    {order.provider.toLowerCase()}
                  </p>
                  <p className="text-slate-500">Fournisseur</p>
                </div>
              </div>

              {order.providerOrderId && (
                <div className="flex items-center gap-2.5 text-slate-400">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="text-white font-medium font-mono text-xs">
                      {order.providerOrderId}
                    </p>
                    <p className="text-slate-500">Réf. fournisseur</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Adresse de livraison */}
          {productData?.shipping && (
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-4 h-4" />
                  Livraison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5 text-xs">
                  <p className="text-white font-medium">{productData.shipping.name}</p>
                  {productData.shipping.company && (
                    <p className="text-slate-300">{productData.shipping.company}</p>
                  )}
                  <p className="text-slate-300">{productData.shipping.address1}</p>
                  {productData.shipping.address2 && (
                    <p className="text-slate-300">{productData.shipping.address2}</p>
                  )}
                  <p className="text-slate-300">
                    {productData.shipping.zip} {productData.shipping.city}
                  </p>
                  {productData.shipping.state && (
                    <p className="text-slate-300">{productData.shipping.state}</p>
                  )}
                  <p className="text-slate-300">{productData.shipping.country}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <TimelineItem
                  icon={CheckCircle2}
                  title="Commande créée"
                  time={order.createdAt}
                  active
                />
                {order.status !== 'CREATED' && (
                  <TimelineItem
                    icon={CheckCircle2}
                    title="Paiement confirmé"
                    time={order.updatedAt}
                    active
                  />
                )}
                {order.status === 'SENT' || order.status === 'FULFILLED' ? (
                  <TimelineItem
                    icon={CheckCircle2}
                    title="Envoyée au fournisseur"
                    time={order.updatedAt}
                    active
                  />
                ) : null}
                {order.status === 'FULFILLED' ? (
                  <TimelineItem
                    icon={CheckCircle2}
                    title="Commande livrée"
                    time={order.updatedAt}
                    active
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ 
  icon: Icon, 
  title, 
  time, 
  active = false 
}: { 
  icon: any; 
  title: string; 
  time: Date; 
  active?: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
        active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'
      }`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1">
        <p className={`text-xs font-medium ${active ? 'text-white' : 'text-slate-500'}`}>
          {title}
        </p>
        <p className="text-xs text-slate-600">
          {new Date(time).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
}
