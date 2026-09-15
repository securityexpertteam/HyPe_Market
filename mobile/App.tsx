import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Provider as PaperProvider } from 'react-native-paper';

type Product = {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  imageURL: string;
};

type Cart = Product & { quantity: number };

const API = 'http://10.0.2.2:4000/api';

const featured: Product[] = [
  {
    _id: '1',
    name: 'Cloud Runner',
    description: 'Featherlight runners made for everyday motion and elevated comfort.',
    category: 'Sneakers',
    price: 3499,
    stock: 18,
    imageURL: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  },
  {
    _id: '2',
    name: 'Everyday Carry',
    description: 'A refined commuter carryall designed with soft structure and utility.',
    category: 'Accessories',
    price: 1899,
    stock: 12,
    imageURL: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
  },
  {
    _id: '3',
    name: 'Studio Headphones',
    description: 'Premium wireless sound with warm detail and a luxurious finish.',
    category: 'Electronics',
    price: 5999,
    stock: 7,
    imageURL: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
  },
];

const categories = ['All', 'Sneakers', 'Accessories', 'Electronics'];
type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';

type StoreOrder = {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: Array<{ productId: string; name: string; price: number; quantity: number; imageURL: string }>;
};

const formatPrice = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const createDemoOrder = (items: Cart[]): StoreOrder => ({
  id: `ord_${Date.now()}`,
  status: 'pending',
  total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  createdAt: new Date().toISOString(),
  items: items.map((item) => ({
    productId: item._id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    imageURL: item.imageURL,
  })),
});

const Shop = () => {
  const [page, setPage] = useState<'home' | 'detail' | 'cart' | 'checkout' | 'seller' | 'auth' | 'orders'>('home');
  const [products, setProducts] = useState(featured);
  const [selected, setSelected] = useState<Product>(featured[0]);
  const [cart, setCart] = useState<Cart[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([
    {
      id: 'ord_1024',
      status: 'confirmed',
      total: 3499,
      createdAt: '2026-09-10T10:30:00.000Z',
      items: [{ productId: '1', name: 'Cloud Runner', price: 3499, quantity: 1, imageURL: featured[0].imageURL }],
    },
    {
      id: 'ord_1025',
      status: 'pending',
      total: 1899,
      createdAt: '2026-09-12T15:05:00.000Z',
      items: [{ productId: '2', name: 'Everyday Carry', price: 1899, quantity: 1, imageURL: featured[1].imageURL }],
    },
  ]);
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [activeCategory, setActiveCategory] = useState('All');

  const add = (p: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item._id === p._id);

      if (existing) {
        return current.map((item) =>
          item._id === p._id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { ...p, quantity: 1 }];
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const visibleProducts =
    activeCategory === 'All' ? products : products.filter((item) => item.category === activeCategory);

  const cancelOrder = (orderId: string) => {
    const targetOrder = orders.find((order) => order.id === orderId);
    if (!targetOrder) return;

    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status: 'cancelled' } : order)),
    );

    setProducts((current) =>
      current.map((product) => {
        const matchedItem = targetOrder.items.find((item) => item.productId === product._id);
        if (!matchedItem) return product;
        return { ...product, stock: product.stock + matchedItem.quantity };
      }),
    );
  };

  if (page === 'auth') {
    return (
      <Auth
        done={(value: 'buyer' | 'seller') => {
          setRole(value);
          setPage(value === 'seller' ? 'seller' : 'home');
        }}
      />
    );
  }

  if (page === 'seller') {
    return (
      <Seller
        products={products}
        add={(product: Product) => setProducts((items) => [{ ...product, _id: String(Date.now()) }, ...items])}
        back={() => setPage('home')}
      />
    );
  }

  if (page === 'orders') {
    return <OrdersScreen orders={orders} cart={cart.length} cancelOrder={cancelOrder} go={setPage} />;
  }

  if (page === 'checkout') {
    return (
      <Checkout
        total={total}
        success={() => {
          const newOrder = createDemoOrder(cart);
          setOrders((current) => [newOrder, ...current]);
          setProducts((current) =>
            current.map((product) => {
              const item = cart.find((entry) => entry._id === product._id);
              if (!item) return product;
              return { ...product, stock: Math.max(0, product.stock - item.quantity) };
            }),
          );
          setCart([]);
          setPage('orders');
        }}
      />
    );
  }

  if (page === 'cart') {
    return (
      <SafeAreaView style={styles.page}>
        <Header cart={cart.length} go={setPage} />
        <View style={styles.contentWrap}>
          <Text style={styles.pageTitle}>Your bag</Text>
          <FlatList
            data={cart}
            keyExtractor={(item) => item._id}
            contentContainerStyle={cart.length === 0 ? styles.emptyList : styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyState}>Your bag is waiting for a find.</Text>}
            renderItem={({ item }) => (
              <View style={styles.cartItemCard}>
                <Image source={{ uri: item.imageURL }} style={styles.cartThumb} />
                <View style={styles.cartItemMeta}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{formatPrice(item.price)} × {item.quantity}</Text>
                  <Pressable onPress={() => setCart((current) => current.filter((entry) => entry._id !== item._id))}>
                    <Text style={styles.inlineAction}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
          {cart.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Order total</Text>
              <Text style={styles.summaryTotal}>{formatPrice(total)}</Text>
              <Button mode="contained" onPress={() => setPage('checkout')} buttonColor="#6d28d9">
                Continue to checkout
              </Button>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (page === 'detail') {
    return (
      <SafeAreaView style={styles.page}>
        <Header cart={cart.length} go={setPage} />
        <ScrollView contentContainerStyle={styles.detailScroll}>
          <Image source={{ uri: selected.imageURL }} style={styles.heroImage} />
          <View style={styles.detailContent}>
            <View style={styles.detailPillRow}>
              <Chip style={styles.softChip}>{selected.category}</Chip>
              <Chip style={styles.softChip}>4.9 rating</Chip>
            </View>
            <Text style={styles.pageTitle}>{selected.name}</Text>
            <Text style={styles.priceLarge}>{formatPrice(selected.price)}</Text>
            <Text style={styles.description}>{selected.description}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaBadge}>Free delivery</Text>
              <Text style={styles.muted}>{selected.stock} left in stock</Text>
            </View>
            <Button mode="contained" icon="cart-plus" onPress={() => add(selected)} buttonColor="#1f114d">
              Add to bag
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <Header cart={cart.length} go={setPage} />
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <LinearGradient colors={['#ff7a59', '#8f45ff', '#210b42']} style={styles.banner}>
              <Text style={styles.bannerEyebrow}>THE NEW DROP</Text>
              <Text style={styles.bannerTitle}>Curated finds for a sharper everyday.</Text>
              <Button mode="contained-tonal" onPress={() => setPage('detail')} buttonColor="#fff" textColor="#201336">
                Shop featured
              </Button>
            </LinearGradient>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shop categories</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
              {categories.map((item) => {
                const active = activeCategory === item;
                return (
                  <Pressable key={item} onPress={() => setActiveCategory(item)}>
                    <Chip
                      mode={active ? 'flat' : 'outlined'}
                      selected={active}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      textStyle={active ? styles.categoryChipTextActive : styles.categoryChipText}
                    >
                      {item}
                    </Chip>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending now</Text>
              <Text style={styles.sectionLink}>See all</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setSelected(item);
              setPage('detail');
            }}
            style={styles.productCard}
          >
            <Image source={{ uri: item.imageURL }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemMeta}>{item.category}</Text>
              <View style={styles.productFooter}>
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
                <Button compact mode="contained" onPress={() => add(item)} buttonColor="#6d28d9">
                  Add
                </Button>
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
};

const Header = ({ cart, go }: any) => (
  <View style={styles.headerWrap}>
    <LinearGradient colors={['rgba(255,255,255,0.96)', 'rgba(245,238,255,0.82)']} style={styles.header}>
      <Text style={styles.logo}>HYPE</Text>
      <View style={styles.headerRight}>
        <Pressable onPress={() => go('auth')}>
          <Text style={styles.nav}>Account</Text>
        </Pressable>
        <Pressable onPress={() => go('orders')}>
          <Text style={styles.nav}>Orders</Text>
        </Pressable>
        <Pressable onPress={() => go('cart')} style={styles.bagBadgeWrap}>
          <Text style={styles.nav}>Bag</Text>
          <View style={styles.bagBadge}><Text style={styles.bagBadgeText}>{cart}</Text></View>
        </Pressable>
      </View>
    </LinearGradient>
  </View>
);

const OrdersScreen = ({ orders, cart, cancelOrder, go }: { orders: StoreOrder[]; cart: number; cancelOrder: (id: string) => void; go: (page: 'home' | 'detail' | 'cart' | 'checkout' | 'seller' | 'auth' | 'orders') => void; }) => (
  <SafeAreaView style={styles.page}>
    <Header cart={cart} go={go} />
    <View style={styles.contentWrap}>
      <View style={styles.sectionHeader}>
        <Text style={styles.pageTitle}>My orders</Text>
        <Text style={styles.sectionLink}>{orders.filter((order) => order.status !== 'cancelled').length} active</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => <OrderCard order={item} index={index} onCancel={cancelOrder} />}
      />
    </View>
  </SafeAreaView>
);

const OrderCard = ({ order, index, onCancel }: { order: StoreOrder; index: number; onCancel: (id: string) => void }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, [fade, translateY, index]);

  const statusColor = order.status === 'cancelled' ? '#b91c1c' : order.status === 'delivered' ? '#166534' : order.status === 'confirmed' ? '#7c3aed' : '#d97706';

  return (
    <Animated.View style={[styles.orderCard, { opacity: fade, transform: [{ translateY }] }]}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{order.id.replace('ord_', '')}</Text>
          <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{order.status}</Text>
        </View>
      </View>

      {order.items.map((item) => (
        <View key={`${order.id}-${item.productId}`} style={styles.orderItemRow}>
          <Image source={{ uri: item.imageURL }} style={styles.orderThumb} />
          <View style={styles.orderItemMeta}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
          </View>
          <Text style={styles.price}>{formatPrice(item.price * item.quantity)}</Text>
        </View>
      ))}

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{formatPrice(order.total)}</Text>
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <Button mode="contained" compact onPress={() => onCancel(order.id)} buttonColor="#991b1b">
            Cancel order
          </Button>
        )}
      </View>
    </Animated.View>
  );
};

const Auth = ({ done }: { done: (value: 'buyer' | 'seller') => void }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [seller, setSeller] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={[styles.page, styles.center]}>
      <LinearGradient colors={['#fdf7ff', '#f3edff']} style={styles.authCard}>
        <Text style={styles.logo}>HYPE</Text>
        <Text style={styles.authEyebrow}>Premium access</Text>
        <Text style={styles.pageTitle}>{mode === 'signin' ? (seller ? 'Seller portal' : 'Welcome back') : 'Create account'}</Text>
        <Text style={styles.muted}>A seamless storefront experience for your next order.</Text>

        <View style={styles.authToggleRow}>
          <Pressable
            onPress={() => setMode('signin')}
            style={[styles.authToggle, mode === 'signin' && styles.authToggleActive]}
          >
            <Text style={[styles.authToggleText, mode === 'signin' && styles.authToggleTextActive]}>Sign in</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('signup')}
            style={[styles.authToggle, mode === 'signup' && styles.authToggleActive]}
          >
            <Text style={[styles.authToggleText, mode === 'signup' && styles.authToggleTextActive]}>Sign up</Text>
          </Pressable>
        </View>

        {mode === 'signup' && (
          <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
        )}
        <TextInput style={styles.input} placeholder="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        <View style={styles.roleRow}>
          <Pressable onPress={() => setSeller(false)} style={[styles.roleOption, !seller && styles.roleOptionActive]}>
            <Text style={[styles.roleOptionText, !seller && styles.roleOptionTextActive]}>Buyer</Text>
          </Pressable>
          <Pressable onPress={() => setSeller(true)} style={[styles.roleOption, seller && styles.roleOptionActive]}>
            <Text style={[styles.roleOptionText, seller && styles.roleOptionTextActive]}>Seller</Text>
          </Pressable>
        </View>

        <Button
          mode="contained"
          onPress={() => done(seller ? 'seller' : 'buyer')}
          buttonColor="#201336"
          style={styles.primaryAuthAction}
        >
          {mode === 'signin' ? 'Continue' : 'Create account'}
        </Button>

        <Button onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} textColor="#4c1d95">
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </Button>
      </LinearGradient>
    </SafeAreaView>
  );
};

const Checkout = ({ total, success }: any) => {
  const [step, setStep] = useState(1);

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.contentWrap}>
        <Text style={styles.pageTitle}>Checkout · {step}/2</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
        </View>

        {step === 1 ? (
          <>
            <TextInput style={styles.input} placeholder="Delivery address" />
            <TextInput style={styles.input} placeholder="Contact number" />
            <Button mode="contained" onPress={() => setStep(2)} buttonColor="#6d28d9">
              Review payment
            </Button>
          </>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Payment</Text>
              <Text style={styles.summaryTotal}>{formatPrice(total)}</Text>
              <Text style={styles.muted}>Dummy payment · secure checkout</Text>
            </View>
            <Button
              mode="contained"
              onPress={() => {
                Alert.alert('Payment successful', 'Your order is confirmed. ETA: 3–5 business days');
                success();
              }}
              buttonColor="#111827"
            >
              Pay now
            </Button>
            <Button onPress={() => Alert.alert('Payment failed', 'Mock failure flow — no charge was made.')} textColor="#b91c1c">
              Try failure flow
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const Seller = ({ products, add, back }: any) => {
  const [name, setName] = useState('');

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.contentWrap}>
        <Text style={styles.pageTitle}>Seller inventory</Text>
        <Text style={styles.muted}>Live products · stock management</Text>

        <TextInput style={styles.input} placeholder="New product name" value={name} onChangeText={setName} />
        <Button
          mode="contained"
          onPress={() => {
            if (name) {
              add({
                name,
                description: 'Fresh from your shop.',
                category: 'New',
                price: 999,
                stock: 5,
                imageURL: featured[0].imageURL,
              });
              setName('');
            }
          }}
          buttonColor="#6d28d9"
        >
          Add product
        </Button>

        <Button onPress={back} textColor="#4c1d95">Back to store</Button>

        {products.map((product: Product) => (
          <View style={styles.sellerItemCard} key={product._id}>
            <View style={styles.sellerItemInfo}>
              <Text style={styles.itemTitle}>{product.name}</Text>
              <Text style={styles.muted}>{product.stock} in stock</Text>
            </View>
            <View style={styles.inlineActions}>
              <Button compact mode="outlined" onPress={() => {}}>
                Edit
              </Button>
              <Button compact textColor="#b91c1c" onPress={() => {}}>
                Delete
              </Button>
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

export default () => (
  <PaperProvider>
    <SafeAreaProvider>
      <Shop />
    </SafeAreaProvider>
  </PaperProvider>
);

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f7f3ff',
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(109, 40, 217, 0.08)',
    shadowColor: '#1e1038',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    fontWeight: '900',
    fontSize: 25,
    letterSpacing: 2,
    color: '#1d1234',
  },
  nav: {
    fontWeight: '700',
    color: '#3b1d58',
    fontSize: 14,
  },
  bagBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bagBadge: {
    backgroundColor: '#5b21b6',
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  bagBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 4,
    paddingBottom: 28,
  },
  emptyList: {
    paddingTop: 24,
  },
  banner: {
    marginTop: 8,
    marginBottom: 18,
    borderRadius: 28,
    padding: 24,
    minHeight: 210,
    justifyContent: 'space-between',
    shadowColor: '#3f2d78',
    shadowOpacity: 0.25,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  bannerEyebrow: {
    color: '#fef3ff',
    fontWeight: '800',
    letterSpacing: 1.6,
    fontSize: 12,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    maxWidth: 280,
    lineHeight: 38,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f1237',
  },
  sectionLink: {
    fontSize: 13,
    color: '#6d28d9',
    fontWeight: '700',
  },
  chipsWrap: {
    paddingVertical: 4,
    paddingRight: 16,
    gap: 8,
  },
  categoryChip: {
    marginRight: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderColor: '#d8c7f5',
  },
  categoryChipActive: {
    backgroundColor: '#efe7ff',
    borderColor: '#7c3aed',
  },
  categoryChipText: {
    color: '#3d2c55',
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#2a1254',
    fontWeight: '800',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#efe7ff',
    marginBottom: 16,
    shadowColor: '#1d1137',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  productImage: {
    height: 210,
    width: '100%',
    backgroundColor: '#f2e7ff',
  },
  productInfo: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1d1234',
  },
  itemMeta: {
    fontSize: 13,
    color: '#6f5d7b',
    marginTop: 4,
  },
  productFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '900',
    color: '#d9485f',
  },
  priceLarge: {
    fontSize: 32,
    fontWeight: '900',
    color: '#d9485f',
    marginBottom: 16,
  },
  detailScroll: {
    paddingBottom: 28,
  },
  heroImage: {
    height: 400,
    width: '100%',
    backgroundColor: '#f2e7ff',
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
  },
  detailPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  softChip: {
    backgroundColor: '#f2ebff',
    borderColor: '#d9ccff',
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1f1237',
    marginVertical: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
    color: '#3d2d4d',
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  metaBadge: {
    backgroundColor: '#eefbf3',
    color: '#166534',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: '700',
    overflow: 'hidden',
  },
  muted: {
    color: '#6b5e7b',
    fontSize: 13,
  },
  emptyState: {
    textAlign: 'center',
    color: '#685d77',
    fontSize: 16,
    marginTop: 18,
    fontWeight: '600',
  },
  cartItemCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0e8ff',
    marginBottom: 12,
  },
  cartThumb: {
    width: 86,
    height: 86,
    borderRadius: 16,
    backgroundColor: '#f1ebff',
  },
  cartItemMeta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  inlineAction: {
    color: '#7c3aed',
    marginTop: 8,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#efe7ff',
    shadowColor: '#1d1137',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  summaryLabel: {
    color: '#6f5d7b',
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryTotal: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 18,
    color: '#1f1237',
  },
  center: {
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  authCard: {
    width: '100%',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#ece1ff',
    shadowColor: '#432a76',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  authEyebrow: {
    color: '#6d28d9',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  authToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1ebff',
    borderRadius: 14,
    padding: 4,
    marginTop: 18,
    marginBottom: 10,
  },
  authToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  authToggleActive: {
    backgroundColor: '#fff',
    shadowColor: '#1e1038',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  authToggleText: {
    color: '#6b5e7b',
    fontWeight: '700',
  },
  authToggleTextActive: {
    color: '#1d1234',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e8dcff',
    backgroundColor: '#f9f5ff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: '#efe7ff',
    borderColor: '#7c3aed',
  },
  roleOptionText: {
    color: '#4b3b5f',
    fontWeight: '700',
  },
  roleOptionTextActive: {
    color: '#2a1254',
  },
  primaryAuthAction: {
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5d9fb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 8,
    fontSize: 16,
    color: '#2f1d3f',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#eadfff',
    borderRadius: 999,
    marginVertical: 18,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 999,
  },
  sellerItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f0e8ff',
  },
  sellerItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ebdcff',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1d1137',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontWeight: '800',
    color: '#1f1237',
    fontSize: 15,
  },
  orderDate: {
    color: '#695d78',
    fontSize: 12,
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    textTransform: 'capitalize',
    fontWeight: '800',
    fontSize: 12,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 12,
  },
  orderItemMeta: {
    flex: 1,
  },
  orderFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1f1237',
  },
});

