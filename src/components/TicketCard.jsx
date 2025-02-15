import { Card, CardContent } from "@/components/ui/card";
import { FaMapMarkerAlt } from "react-icons/fa";

export default function TicketCard({ selectedTicket }) {
  return (
    <Card className="bg-gray-700 p-4 rounded-md">
      <CardContent className="text-center">
        <h3 className="text-2xl font-bold sm:text-xl">Techember Fest '25</h3>
        <p className="text-gray-400 text-sm sm:text-xs">
          Join us for an unforgettable experience at <br /> [Event Name]! Secure your spot now.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-1 mt-2 text-gray-300 text-sm sm:text-xs">
          <FaMapMarkerAlt /> <span>[Event Location]</span>
          <span> | </span>
          <span>March 15, 2025 | 7:00 PM</span>
        </div>
        {selectedTicket && (
          <div className="mt-4">
            <h4 className="text-lg font-semibold">{selectedTicket.type} Ticket</h4>
            <p className="text-gray-400">{selectedTicket.price}</p>
            <p className="text-gray-400">{selectedTicket.access}</p>
            <p className="text-gray-400">Available: {selectedTicket.available}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}