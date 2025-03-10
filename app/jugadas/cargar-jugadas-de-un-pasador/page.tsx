"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import toast from "react-hot-toast"
import Navbar from "@/app/components/Navbar"

interface Pasador {
    id: string
    displayId: string
    nombre: string
    nombreFantasia: string
}

interface Jugada {
    numero: string
    posicion: string
    importe: string
}

const lotteryAbbreviations: { [key: string]: string } = {
    LAPREVIA: "PRE",
    PRIMERA: "PR",
    MATUTINA: "MA",
    VESPERTINA: "VE",
    NOCTURNA: "NO",
}

const provinceAbbreviations: { [key: string]: string } = {
    NACION: "N",
    PROVIN: "P",
    SANTA: "SF",
    CORDOB: "C",
    URUGUA: "U",
    ENTRE: "E",
    MENDOZ: "M",
    CORRIE: "CR",
    CHACO: "CH",
}

export default function CargarJugadas() {
    const [selectedLotteries, setSelectedLotteries] = useState<string[]>([])
    const [pasadores, setPasadores] = useState<Pasador[]>([])
    const [selectedPasador, setSelectedPasador] = useState<string>("")
    const [selectedSorteo, setSelectedSorteo] = useState<string>("")
    const [jugadas, setJugadas] = useState<Jugada[]>(Array(4).fill({ numero: "", posicion: "", importe: "" }))
    const [totalMonto, setTotalMonto] = useState(0)
    const [ticketContent, setTicketContent] = useState<string>("")
    const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
    const [secuenciaCounter, setSecuenciaCounter] = useState(10000)

    const horarios = [
        { id: "LAPREVIA", label: "La Previa (10:15)" },
        { id: "PRIMERA", label: "Primera (12:00)" },
        { id: "MATUTINA", label: "Matutina (15:00)" },
        { id: "VESPERTINA", label: "Vespertina (18:00)" },
        { id: "NOCTURNA", label: "Nocturna (21:00)" },
    ]

    const loterias = [
        { id: "NACION", label: "Nacional" },
        { id: "PROVIN", label: "Provincia" },
        { id: "SANTA", label: "Santa Fe" },
        { id: "CORDOB", label: "Córdoba" },
        { id: "URUGUA", label: "Uruguay" },
        { id: "ENTRE", label: "Entre Ríos" },
        { id: "MENDOZ", label: "Mendoza" },
        { id: "CORRIE", label: "Corrientes" },
        { id: "CHACO", label: "Chaco" },
    ]

    useEffect(() => {
        fetchPasadores()
        loadSecuenciaCounter()
    }, [])

    const fetchPasadores = async () => {
        try {
            const pasadoresCollection = collection(db, "pasadores")
            const pasadoresSnapshot = await getDocs(pasadoresCollection)
            const pasadoresList = pasadoresSnapshot.docs.map((doc) => ({
                id: doc.id,
                displayId: doc.data().displayId,
                nombre: doc.data().nombre,
                nombreFantasia: doc.data().nombreFantasia,
            }))
            setPasadores(pasadoresList)
        } catch (error) {
            console.error("Error fetching pasadores:", error)
            toast.error("Error al cargar los pasadores")
        }
    }

    const loadSecuenciaCounter = () => {
        const storedCounter = localStorage.getItem("secuenciaCounter")
        if (storedCounter) {
            setSecuenciaCounter(Number.parseInt(storedCounter))
        }
    }

    const incrementSecuenciaCounter = useCallback(() => {
        setSecuenciaCounter((prevCounter) => {
            const newCounter = prevCounter + 1
            localStorage.setItem("secuenciaCounter", newCounter.toString())
            return newCounter
        })
    }, [])

    const calcularTotalMonto = useCallback(() => {
        const total = jugadas.reduce((sum, jugada) => {
            const importe = Number.parseFloat(jugada.importe) || 0
            return sum + importe * selectedLotteries.length
        }, 0)
        setTotalMonto(total)
    }, [jugadas, selectedLotteries])

    useEffect(() => {
        calcularTotalMonto()
    }, [calcularTotalMonto])

    const handleJugadaChange = (index: number, field: keyof Jugada, value: string) => {
        const newJugadas = [...jugadas]
        newJugadas[index] = { ...newJugadas[index], [field]: value }
        setJugadas(newJugadas)
    }

    const handleLotteryChange = (lotteryId: string, checked: boolean) => {
        setSelectedLotteries((prev) => (checked ? [...prev, lotteryId] : prev.filter((id) => id !== lotteryId)))
    }

    const formatDate = (date: Date) => {
        return date.toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        })
    }

    const generarSecuencia = () => {
        const secuencia = secuenciaCounter.toString().padStart(9, "0")
        incrementSecuenciaCounter()
        return secuencia
    }

    const generarTicket = (jugadasParaTicket: Jugada[]) => {
        const pasadorSeleccionado = pasadores.find((p) => p.id === selectedPasador)
        if (!pasadorSeleccionado) {
            toast.error("Pasador no encontrado")
            return
        }

        let ticketContent = ""
        const fechaHora = formatDate(new Date())
        const terminal = "72-0005"
        const secuencia = generarSecuencia()

        ticketContent += "TICKET\n"
        ticketContent += `FECHA/HORA ${fechaHora}\n`
        ticketContent += `TERMINAL   ${terminal}\n`
        ticketContent += `PASADOR    ${pasadorSeleccionado.nombre}\n`
        ticketContent += `SORTEO     ${selectedSorteo}\n`
        ticketContent += "-".repeat(32) + "\n"

        const loteriaAbreviada = lotteryAbbreviations[selectedSorteo] || selectedSorteo
        ticketContent += `${loteriaAbreviada}\n`
        ticketContent += `SECUENCIA  ${secuencia}\n`

        const provinciasSet = new Set(selectedLotteries.map((l) => provinceAbbreviations[l] || l))
        ticketContent += `LOTERIAS: ${Array.from(provinciasSet).join(" ")}\n`
        ticketContent += "NUMERO UBIC   IMPORTE\n"

        jugadasParaTicket.forEach((jugada) => {
            const numero = jugada.numero.padStart(4, " ")
            const posicion = jugada.posicion.padStart(2, " ")
            const importe = Number.parseFloat(jugada.importe) || 0
            ticketContent += `${numero}  ${posicion}   $${importe.toFixed(2)}\n`
        })

        ticketContent += "-".repeat(32) + "\n"
        ticketContent += `TOTAL: $${totalMonto.toFixed(2)}`.padStart(32) + "\n"

        setTicketContent(ticketContent)
        setIsTicketDialogOpen(true)

        return secuencia
    }

    const guardarJugadas = async () => {
        if (jugadas.length === 0 || !selectedPasador || selectedLotteries.length === 0 || !selectedSorteo) {
            toast.error("Faltan datos para guardar las jugadas")
            return
        }

        try {
            const pasadorSeleccionado = pasadores.find((p) => p.id === selectedPasador)
            if (!pasadorSeleccionado) {
                toast.error("Pasador no encontrado")
                return
            }

            const jugadasValidas = jugadas.filter((j) => j.numero && j.posicion && j.importe)
            if (jugadasValidas.length === 0) {
                toast.error("No hay jugadas válidas para guardar")
                return
            }

            const secuencia = generarTicket(jugadasValidas)

            const jugadasPasadorCollection = collection(db, `JUGADAS DE ${pasadorSeleccionado.nombre}`)

            const nuevaJugada = {
                fechaHora: serverTimestamp(),
                id: secuencia,
                jugadas: jugadasValidas.map((jugada) => ({
                    decompositionStep: 0,
                    fechaHora: new Date().toISOString(),
                    loteria: selectedSorteo,
                    monto: jugada.importe,
                    montoTotal: Number.parseFloat(jugada.importe),
                    numero: jugada.numero,
                    numeros: [jugada.numero],
                    originalNumero: jugada.numero,
                    originalPosicion: jugada.posicion,
                    posicion: jugada.posicion,
                    provincias: selectedLotteries,
                    secuencia: secuencia,
                    tipo: "NUEVA JUGADA",
                })),
                loteria: selectedSorteo,
                monto: totalMonto.toFixed(2),
                numero: jugadasValidas[0].numero,
                numeros: jugadasValidas.map((j) => j.numero),
                pasadorId: selectedPasador,
                provincias: selectedLotteries,
                secuencia: secuencia,
                tipo: "NUEVA JUGADA",
                totalMonto: totalMonto,
            }

            await addDoc(jugadasPasadorCollection, nuevaJugada)

            toast.success("Jugadas guardadas exitosamente")
            limpiarFormulario()
        } catch (error) {
            console.error("Error al guardar las jugadas:", error)
            toast.error("Error al guardar las jugadas")
        }
    }

    const limpiarFormulario = () => {
        setJugadas(Array(4).fill({ numero: "", posicion: "", importe: "" }))
        setSelectedLotteries([])
        setSelectedSorteo("")
        setTotalMonto(0)
    }

    return (
        <>
            <Navbar />
            <div className="container mx-auto p-4">
                <Card>
                    <CardHeader className="bg-primary text-primary-foreground">
                        <CardTitle className="text-2xl font-bold text-center">PASAR JUGADAS QUINIELA</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <Label htmlFor="sorteo" className="min-w-[80px]">
                                    SORTEO:
                                </Label>
                                <Select value={selectedSorteo} onValueChange={setSelectedSorteo}>
                                    <SelectTrigger id="sorteo" className="w-[200px]">
                                        <SelectValue placeholder="Seleccionar horario" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {horarios.map((horario) => (
                                            <SelectItem key={horario.id} value={horario.id}>
                                                {horario.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="mb-2 block">LOTERÍAS:</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    {loterias.map((loteria) => (
                                        <div key={loteria.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={loteria.id}
                                                checked={selectedLotteries.includes(loteria.id)}
                                                onCheckedChange={(checked) => handleLotteryChange(loteria.id, checked === true)}
                                            />
                                            <Label htmlFor={loteria.id}>{loteria.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex">
                                <div className="flex items-center gap-4">
                                    <Label htmlFor="pasador" className="min-w-[80px]">
                                        PASADOR:
                                    </Label>
                                    <Select value={selectedPasador} onValueChange={setSelectedPasador}>
                                        <SelectTrigger id="pasador" className="w-[200px]">
                                            <SelectValue placeholder="Seleccionar pasador" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pasadores.map((pasador) => (
                                                <SelectItem key={pasador.id} value={pasador.id}>
                                                    {`${pasador.displayId} - ${pasador.nombreFantasia || pasador.nombre}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-2">DATOS DE LA JUGADA</h3>
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[100px]">Nº</TableHead>
                                                <TableHead>NÚMERO</TableHead>
                                                <TableHead>POSICIÓN</TableHead>
                                                <TableHead>IMPORTE</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {jugadas.map((jugada, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{(index + 1).toString().padStart(3, "0")}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            className="w-full"
                                                            value={jugada.numero}
                                                            onChange={(e) => handleJugadaChange(index, "numero", e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            className="w-full"
                                                            value={jugada.posicion}
                                                            onChange={(e) => handleJugadaChange(index, "posicion", e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            className="w-full"
                                                            value={jugada.importe}
                                                            onChange={(e) => handleJugadaChange(index, "importe", e.target.value)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="text-xl font-bold">Total: ${totalMonto.toFixed(2)}</div>
                                <Button onClick={guardarJugadas}>Cargar Jugadas</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ticket de Jugada</DialogTitle>
                        </DialogHeader>
                        <pre className="whitespace-pre-wrap font-mono text-sm">{ticketContent}</pre>
                        <DialogFooter>
                            <Button onClick={() => setIsTicketDialogOpen(false)}>Cerrar</Button>
                            <Button
                                onClick={() => {
                                    const printWindow = window.open("", "", "width=300,height=600")
                                    if (printWindow) {
                                        printWindow.document.write(`
                      <html>
                        <head>
                          <title>Ticket de Jugada</title>
                          <style>
                            body {
                              font-family: 'Courier New', monospace;
                              font-size: 12px;
                              width: 80mm;
                              margin: 0;
                              padding: 10px;
                            }
                            pre {
                              white-space: pre-wrap;
                              margin: 0;
                            }
                          </style>
                        </head>
                        <body>
                          <pre>${ticketContent}</pre>
                        </body>
                      </html>
                    `)
                                        printWindow.document.close()
                                        printWindow.focus()
                                        printWindow.print()
                                        printWindow.close()
                                    }
                                }}
                            >
                                Imprimir
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    )
}

