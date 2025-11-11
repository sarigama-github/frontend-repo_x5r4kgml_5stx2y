import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { apiGet, apiPost, apiPut, apiDelete, getToken, getUser, setAuth, clearAuth } from './api'

const categories = ["All", "Mobiles", "Laptops", "Accessories", "Fashion"]

function Layout({ children }) {
  const navigate = useNavigate()
  const user = getUser()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="font-bold text-2xl">Flipkart Mini</Link>
          <div className="flex-1">
            <div className="flex bg-white rounded overflow-hidden">
              <select value={category} onChange={(e)=>setCategory(e.target.value)} className="text-gray-800 px-2 border-r">
                {categories.map(c=> <option key={c}>{c}</option>)}
              </select>
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search for products" className="flex-1 px-3 text-gray-800 outline-none"/>
              <button onClick={()=>navigate(`/?q=${encodeURIComponent(query)}&cat=${encodeURIComponent(category)}`)} className="bg-blue-500 px-4">Search</button>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm">Hi, {user.name}</span>
                <button onClick={()=>{clearAuth(); navigate('/')}} className="text-sm underline">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="underline">Login</Link>
                <Link to="/signup" className="underline">Signup</Link>
              </>
            )}
            <Link to="/cart" className="underline">Cart</Link>
            {user?.is_admin && <Link to="/admin" className="underline">Admin</Link>}
          </nav>
        </div>
        <div className="bg-blue-700">
          <div className="max-w-6xl mx-auto px-4 py-2 flex gap-4 text-sm">
            {categories.slice(1).map(c=> <Link key={c} to={`/?cat=${encodeURIComponent(c)}`}>{c}</Link>)}
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">{children}</main>
      <footer className="mt-10 py-6 text-center text-gray-600">© {new Date().getFullYear()} Flipkart Mini Clone</footer>
    </div>
  )
}

function useQuery(){
  const { search } = useLocation()
  return useMemo(()=> new URLSearchParams(search), [search])
}

function Home(){
  const qs = useQuery()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    const q = qs.get('q') || undefined
    const cat = qs.get('cat') && qs.get('cat') !== 'All' ? qs.get('cat') : undefined
    apiGet(`/products${q||cat?`?${new URLSearchParams({ ...(q?{q}:{}), ...(cat?{category:cat}:{}) }).toString()}`:''}`)
      .then(setItems).finally(()=>setLoading(false))
  }, [qs.toString()])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Top Deals</h2>
      {loading ? <p>Loading...</p> : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(p=> <Link key={p.id} to={`/product/${p.id}`} className="bg-white shadow hover:shadow-md rounded overflow-hidden">
            <div className="h-40 bg-gray-100 flex items-center justify-center">
              <img src={p.images?.[0]} alt={p.name} className="max-h-40"/>
            </div>
            <div className="p-3">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-500">{p.brand}</div>
              <div className="text-yellow-500">{'★'.repeat(Math.round(p.rating||4))}</div>
              <div className="text-lg font-semibold">₹{p.price}</div>
            </div>
          </Link>)}
        </div>
      )}
    </div>
  )
}

function ProductDetails(){
  const { pathname } = useLocation()
  const id = pathname.split('/').pop()
  const [p, setP] = useState(null)
  const [qty, setQty] = useState(1)
  useEffect(()=>{ apiGet(`/products/${id}`).then(setP) }, [id])
  if(!p) return <p>Loading...</p>
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="bg-white shadow rounded p-4 flex items-center justify-center h-80">
          <img src={p.images?.[0]} alt={p.name} className="max-h-72"/>
        </div>
        {p.images?.length>1 && (
          <div className="flex gap-2 mt-2 overflow-auto">
            {p.images.map((img, idx)=> <img key={idx} src={img} className="h-16 rounded"/>) }
          </div>
        )}
      </div>
      <div>
        <h2 className="text-2xl font-semibold">{p.name}</h2>
        <div className="text-sm text-gray-500 mb-1">{p.brand} • {p.category}</div>
        <div className="text-yellow-500 mb-2">{'★'.repeat(Math.round(p.rating||4))}</div>
        <div className="text-3xl font-bold mb-4">₹{p.price}</div>
        <p className="text-gray-700 mb-4">{p.description}</p>
        <div className="mb-4">
          <label className="mr-2">Qty</label>
          <select value={qty} onChange={e=>setQty(parseInt(e.target.value))} className="border px-2 py-1">
            {[1,2,3,4,5].map(n=> <option key={n}>{n}</option>)}
          </select>
        </div>
        <AddToCartButton product={p} qty={qty} />
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Specs</h3>
          <div className="text-sm bg-white p-3 rounded shadow">
            {Object.entries(p.specs||{}).map(([k,v])=> (
              <div key={k} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-gray-500">{k}</span>
                <span>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AddToCartButton({ product, qty }){
  const navigate = useNavigate()
  const user = getUser()
  function add(){
    const cart = JSON.parse(localStorage.getItem('cart')||'[]')
    const idx = cart.findIndex(i=>i.id===product.id)
    if(idx>-1) cart[idx].quantity += qty; else cart.push({ id: product.id, name: product.name, price: product.price, image: product.images?.[0], quantity: qty })
    localStorage.setItem('cart', JSON.stringify(cart))
    alert('Added to cart')
    navigate('/cart')
  }
  return <button onClick={add} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded">Add to Cart</button>
}

function Cart(){
  const navigate = useNavigate()
  const [items, setItems] = useState(()=>{
    const existing = JSON.parse(localStorage.getItem('cart')||'[]')
    if(existing.length) return existing
    // demo defaults on first load
    const demo = [
      { id: 'demo1', name: 'Sample Headphones', price: 1999, image: 'https://images.unsplash.com/photo-1632140016649-c71eb90f40e1?ixid=M3w3OTkxMTl8MHwxfHNlYXJjaHwxfHxTYW1wbGUlMjBIZWFkcGhvbmVzfGVufDB8MHx8fDE3NjI4NzU2ODB8MA&ixlib=rb-4.1.0&w=1600&auto=format&fit=crop&q=80', quantity: 1 },
      { id: 'demo2', name: 'Casual Sneakers', price: 2999, image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77', quantity: 2 },
    ]
    localStorage.setItem('cart', JSON.stringify(demo))
    return demo
  })
  const total = items.reduce((s,i)=> s + i.price * i.quantity, 0)
  function update(idx, delta){
    const c = [...items]
    c[idx].quantity = Math.max(1, c[idx].quantity + delta)
    setItems(c)
    localStorage.setItem('cart', JSON.stringify(c))
  }
  function remove(idx){
    const c = items.filter((_,i)=>i!==idx)
    setItems(c)
    localStorage.setItem('cart', JSON.stringify(c))
  }
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white rounded shadow">
        {items.map((i,idx)=> (
          <div key={idx} className="flex gap-4 p-4 border-b last:border-0 items-center">
            <img src={i.image} className="h-20"/>
            <div className="flex-1">
              <div className="font-medium">{i.name}</div>
              <div>₹{i.price}</div>
              <div className="flex items-center gap-2">
                <button onClick={()=>update(idx,-1)} className="px-2 border">-</button>
                <span>{i.quantity}</span>
                <button onClick={()=>update(idx,1)} className="px-2 border">+</button>
                <button onClick={()=>remove(idx)} className="ml-4 text-red-600">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded shadow p-4 h-fit">
        <div className="text-lg font-semibold mb-2">Price Details</div>
        <div className="flex justify-between mb-1"><span>Total Items</span><span>{items.length}</span></div>
        <div className="flex justify-between mb-3"><span>Total Amount</span><span>₹{total}</span></div>
        <button onClick={()=>navigate('/checkout')} className="bg-orange-500 hover:bg-orange-600 w-full text-white py-2 rounded">Proceed to Buy</button>
      </div>
    </div>
  )
}

function Checkout(){
  const navigate = useNavigate()
  const token = getToken()
  const user = getUser()
  const [form, setForm] = useState({ name: user?.name||'', address: '', phone: '', payment_method: 'COD' })
  const items = JSON.parse(localStorage.getItem('cart')||'[]')
  const total = items.reduce((s,i)=> s + i.price * i.quantity, 0)
  async function placeOrder(){
    if(!token || !user){ alert('Please login to place order'); return navigate('/login') }
    const body = {
      user_id: user.id,
      items: items.map(i=> ({ product_id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
      total,
      ...form,
    }
    try{
      await apiPost('/orders', body, token)
      alert('Order placed successfully!')
      localStorage.removeItem('cart')
      navigate('/')
    }catch(e){
      alert('Failed to place order')
    }
  }
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white rounded shadow p-4">
        <div className="text-lg font-semibold mb-3">Delivery Details</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="border p-2" placeholder="Full Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="border p-2" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
          <textarea className="border p-2 sm:col-span-2" placeholder="Address" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} />
          <select className="border p-2" value={form.payment_method} onChange={e=>setForm({...form, payment_method:e.target.value})}>
            <option>COD</option>
            <option>Card</option>
            <option>UPI</option>
          </select>
        </div>
        <button onClick={placeOrder} className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded">Place Order</button>
      </div>
      <div className="bg-white rounded shadow p-4 h-fit">
        <div className="text-lg font-semibold mb-2">Order Summary</div>
        {items.map((i,idx)=> <div key={idx} className="flex justify-between py-1 text-sm">
          <span>{i.name} × {i.quantity}</span>
          <span>₹{i.price * i.quantity}</span>
        </div>)}
        <div className="flex justify-between mt-3 font-semibold"><span>Total</span><span>₹{total}</span></div>
      </div>
    </div>
  )
}

function Login(){
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  async function submit(e){
    e.preventDefault()
    try{
      const res = await apiPost('/auth/login', form)
      setAuth(res.token, res.user)
      alert('Login successful')
      navigate('/')
    }catch(e){
      alert('Invalid credentials')
    }
  }
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      <form onSubmit={submit} className="grid gap-3">
        <input className="border p-2" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
        <input className="border p-2" type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})}/>
        <button className="bg-blue-600 text-white py-2 rounded">Login</button>
      </form>
    </div>
  )
}

function Signup(){
  const navigate = useNavigate()
  const [form, setForm] = useState({ name:'', email: '', password: '' })
  async function submit(e){
    e.preventDefault()
    try{
      const res = await apiPost('/auth/signup', form)
      setAuth(res.token, res.user)
      alert('Signup successful')
      navigate('/')
    }catch(e){
      alert('Signup failed')
    }
  }
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Create Account</h2>
      <form onSubmit={submit} className="grid gap-3">
        <input className="border p-2" placeholder="Full Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <input className="border p-2" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
        <input className="border p-2" type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})}/>
        <button className="bg-blue-600 text-white py-2 rounded">Create Account</button>
      </form>
    </div>
  )
}

function Admin(){
  const token = getToken()
  const user = getUser()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name:'', brand:'', description:'', price:0, category:'Mobiles', rating:4, images:'', specs:'', stock:10 })
  useEffect(()=>{ if(!user?.is_admin) navigate('/') },[])
  function load(){ apiGet('/products').then(setItems) }
  useEffect(load, [])
  async function addProduct(e){
    e.preventDefault()
    const body = { ...form, price: Number(form.price), rating: Number(form.rating), images: form.images? form.images.split(',').map(s=>s.trim()):[], specs: form.specs? JSON.parse(form.specs):{} }
    await apiPost('/products', body, token)
    alert('Product added')
    setForm({ name:'', brand:'', description:'', price:0, category:'Mobiles', rating:4, images:'', specs:'', stock:10 })
    load()
  }
  async function remove(id){ await apiDelete(`/products/${id}`, token); load() }
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <h2 className="text-xl font-semibold mb-3">Products</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(p=> (
            <div key={p.id} className="bg-white rounded shadow p-3">
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-gray-500">₹{p.price}</div>
              <button onClick={()=>remove(p.id)} className="text-red-600 text-sm mt-2">Delete</button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Add Product</h3>
        <form onSubmit={addProduct} className="grid gap-2 text-sm">
          <input className="border p-2" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="border p-2" placeholder="Brand" value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})}/>
          <textarea className="border p-2" placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/>
          <input className="border p-2" type="number" placeholder="Price" value={form.price} onChange={e=>setForm({...form, price:e.target.value})}/>
          <select className="border p-2" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
            {categories.slice(1).map(c=> <option key={c}>{c}</option>)}
          </select>
          <input className="border p-2" type="number" step="0.1" placeholder="Rating" value={form.rating} onChange={e=>setForm({...form, rating:e.target.value})}/>
          <input className="border p-2" placeholder="Images (comma separated URLs)" value={form.images} onChange={e=>setForm({...form, images:e.target.value})}/>
          <input className="border p-2" placeholder='Specs JSON e.g. {"ram":"8GB"}' value={form.specs} onChange={e=>setForm({...form, specs:e.target.value})}/>
          <input className="border p-2" type="number" placeholder="Stock" value={form.stock} onChange={e=>setForm({...form, stock:Number(e.target.value)})}/>
          <button className="bg-green-600 text-white py-2 rounded mt-2">Add</button>
        </form>
      </div>
    </div>
  )}

export default function AppRouter(){
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/product/:id" element={<ProductDetails/>} />
          <Route path="/cart" element={<Cart/>} />
          <Route path="/checkout" element={<Checkout/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/signup" element={<Signup/>} />
          <Route path="/admin" element={<Admin/>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
