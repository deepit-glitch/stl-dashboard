// Material code request form — what each department may ask for. Single source of truth for the
// dropdowns on index.html and the department list on admin.html.
//
// To add a department: add an entry to `depts` (its material types and material groups), then set
// its head of department on admin.html. A department appears on the form only once it has a HOD.
// The HOD's phone number lives in the Worker, never here: this repo is public.
//
// Codes are SAP's own (client 300). A line is validated by the Worker on length and character set
// only, so a new code needs no Worker change.
window.MATCODE = {
  descMax: 40, // SAP rejects a material description longer than this
  plants: [
    { code: "1100", name: "Nalagarh" },
    { code: "1600", name: "Noida" }
  ],
  // Commercial unit codes, as EDP keys them in MM01. Most-used first.
  uoms: [
    ["NO", "Number"], ["PC", "Piece"], ["M", "Meter"], ["KG", "Kilogram"], ["SET", "Set"],
    ["L", "Liter"], ["PAC", "Pack"], ["FT", "Foot"], ["ROL", "Roll"], ["PAA", "Pair"],
    ["G", "Gram"], ["FT3", "Cubic foot"], ["ML", "Milliliter"], ["M2", "Square meter"],
    ["MG", "Milligram"], ["MGL", "Milligram/liter"], ["TO", "Ton"]
  ],
  depts: [
    {
      id: "engg",
      label: "Engineering",
      types: [["ZSPR", "Spares"], ["ZCON", "Consumables"]],
      // The 41 material groups carrying a ZSPR/ZCON material in SAP (Oct 2026), plus JTEXSPARE from
      // Engineering's own Excel list, which has no material yet. A-Z by name.
      groups: [
        ["ASSET", "Asset Procurement"], ["BELTS", "Belts"], ["BOILRSPRE", "Boiler Spares"],
        ["BUIROADS", "Building Roads"], ["CHEMICALS", "Chemicals"], ["COMSPARES", "Compressor Spares"],
        ["DGSPARES", "DG Spares"], ["DYNGSPAR", "Dyeing Machine Spare"], ["ELECTRICL", "Electrical Material"],
        ["ELECTRONI", "Electronics Spares"], ["ETPSPARE", "ETP Spare"], ["FIRFIGMAT", "Fire Fighting Material"],
        ["FORLIFSPR", "Fork Lifter Spares"], ["HPLSPARES", "H Plant Spares"], ["HARDWARE", "Hardware Material"],
        ["HOUSKPING", "House Keeping"], ["JERSEY", "Jersey Sheets"], ["JTEXSPARE", "Jtex Spares"],
        ["KNTGSPAR", "Knitting Spare"], ["KNOTTINGS", "Knotex Spares"], ["LABEQUIP", "Lab Equipments"],
        ["LBWELGFT", "Labour Welfare"], ["LOMSPR", "Loom Spare"], ["MACSPARES", "Machinery Spares"],
        ["MECHSPARE", "Mechanical Spares"], ["OFFEQUIP", "Office Equipment"], ["OILLUBCAN", "Oil and Lubricants"],
        ["PBEAM", "Pile Beam"], ["PIPEFITIN", "Pipe Line & Fittings"], ["POLPVCBAG", "Poly Bag / PVC Sheet"],
        ["PREPSPAR", "Preparatory Spare"], ["PRINTSTAT", "Printing & Stationery"], ["PUMVALVES", "Pumps & Valves"],
        ["STITSPARE", "Stitching Machine Spares"], ["STOSPARES", "Stores & Spares"], ["TSUDSPARE", "Tsudakoma Spares"],
        ["TOOLTAKRS", "Tools and Tackles"], ["TOYOSPARE", "Toyota Spares"], ["VAMASPARS", "Vamatex Spares"],
        ["VEHREPAIR", "Vehicle Repair"], ["WNDGSPAR", "Winding Spare"], ["WORSHSPR", "Work Shop Spares"]
      ]
    }
  ]
};
