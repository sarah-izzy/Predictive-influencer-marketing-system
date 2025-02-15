export default function TicketTypeButton({ ticket, selected, onClick }) {
    return (
      <button
        onClick={() => onClick(ticket.type)}
        className={`p-4 rounded-md border ${
          selected === ticket.type ? "border-blue-400" : "border-gray-600"
        } bg-gray-800 text-center hover:border-blue-400 transition sm:p-3`}
      >
        <p className="text-lg font-bold sm:text-base">{ticket.price}</p>
        <p className="text-sm text-gray-300 sm:text-xs">{ticket.access}</p>
        <p className="text-xs text-gray-500 sm:text-xxs">{ticket.available}</p>
      </button>
    );
  }
  