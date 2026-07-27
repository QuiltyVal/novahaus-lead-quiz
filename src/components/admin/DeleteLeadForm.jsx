'use client'

export default function DeleteLeadForm({ leadId }) {
  function confirmDeletion(event) {
    const confirmed = window.confirm(
      'Diesen Lead und alle zugehörigen Daten endgültig löschen?'
    )

    if (!confirmed) {
      event.preventDefault()
    }
  }

  return (
    <form
      method="post"
      action={`/admin/leads/${leadId}/delete`}
      onSubmit={confirmDeletion}
    >
      <button className="admin-primary-button admin-delete-button" type="submit">
        Lead löschen
      </button>
    </form>
  )
}
