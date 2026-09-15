process.env.JWT_SECRET='test-secret'; const jwt=require('jsonwebtoken'); const request=require('supertest'); const Order=require('../src/models/Order'); const Product=require('../src/models/Product'); const app=require('../src/app');

describe('health',()=>it('reports ready',async()=>{await request(app).get('/health').expect(200,{ok:true})}));

describe('order cancellation',()=>{
  afterEach(()=>jest.restoreAllMocks());

  it('restores stock and marks the order cancelled', async () => {
    const token = jwt.sign({ id: 'user-1', role: 'buyer', name: 'Buyer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const order = {
      _id: 'order-1',
      buyer: 'user-1',
      status: 'pending',
      items: [
        { product: 'product-1', name: 'Cloud Runner', price: 3499, quantity: 2, imageURL: 'x' },
      ],
      total: 6998,
      save: jest.fn().mockResolvedValue({
        _id: 'order-1',
        buyer: 'user-1',
        status: 'cancelled',
        items: [{ product: 'product-1', name: 'Cloud Runner', price: 3499, quantity: 2, imageURL: 'x' }],
        total: 6998,
      }),
    };

    jest.spyOn(Order, 'findById').mockResolvedValue(order);
    jest.spyOn(Product, 'updateOne').mockResolvedValue({ acknowledged: true });

    await request(app)
      .patch('/api/orders/order-1/cancel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('cancelled');
      });

    expect(Order.findById).toHaveBeenCalledWith('order-1');
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: 'product-1' }, { $inc: { stock: 2 } });
    expect(order.save).toHaveBeenCalled();
  });
});
