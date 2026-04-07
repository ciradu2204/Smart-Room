import { useState } from 'react'
import { Button, Input } from '../ui'

export default function BookingForm({ roomId, onSubmit }) {
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
  })

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit?.({ roomId, ...form })
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-gray-900">Book this room</h3>
      <Input label="Date" type="date" name="date" value={form.date} onChange={handleChange} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Start" type="time" name="startTime" value={form.startTime} onChange={handleChange} />
        <Input label="End" type="time" name="endTime" value={form.endTime} onChange={handleChange} />
      </div>
      <Input label="Purpose (optional)" name="purpose" value={form.purpose} onChange={handleChange} placeholder="e.g. Study group" />
      <Button type="submit" variant="primary">Book Now</Button>
    </form>
  )
}
