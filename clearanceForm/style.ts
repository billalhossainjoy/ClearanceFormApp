import { StyleSheet } from "@react-pdf/renderer";

const textSize = 10;

export const styles = StyleSheet.create({
  verifyLink: {
    position: "absolute",
    right: 0,
    fontSize: 7,
    margin: 5,
  },

  title: { marginTop: 30 },
  text: {
    width: "100%",
    textAlign: "center",
    fontFamily: "Bangla",
    fontSize: textSize,
    marginBottom: -4,
  },
  text2: {
    width: "100%",
    textAlign: "center",
    fontFamily: "Bangla",
    textDecoration: "underline",
    paddingBottom: 2,
    fontSize: textSize,
  },
  text3: {
    width: "100%",
    fontFamily: "Bangla",
    paddingBottom: "18px",
    fontSize: textSize,
    textAlign: "left",
    paddingHorizontal: 20,
  },
  text4: {
    width: "100%",
    fontFamily: "Bangla",
    paddingBottom: "18px",
    fontSize: textSize,
    textAlign: "left",
  },
  text5: {
    width: "100%",
    fontFamily: "Bangla",
    paddingBottom: "18px",
    fontSize: textSize,
    textAlign: "center",
  },
  t: { padding: 20, marginTop: -40 },

  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableColName: {
    width: "25%", // 100% divided by 7 columns
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColTech: {
    width: "25%", // 100% divided by 7 columns
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCol: {
    width: "14%", // 100% divided by 7 columns
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColId: {
    width: "4%", // 100% divided by 7 columns
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColDept: {
    width: "30%", // 100% divided by 7 columns
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColSign: {
    width: "22%", // 100% divided by 7 columns
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#000",
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },

  tableCell: {
    margin: 0.1,
    fontSize: textSize,
    textAlign: "center",
    fontFamily: "Bangla",
  },
  register: {
    width: "40%",
    fontFamily: "Bangla",
    fontSize: textSize,
    paddingBottom: "14px",
    marginLeft: 350,
    marginTop: 15,
  },
  t2: { padding: 20, marginTop: -52, paddingBottom: 0 },

  Wrapper: {
    padding: 50,
    paddingBottom: 0,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    border: "1px solid black",
    width: "40%",
    padding: 10,
    margin: 10,
    display: "flex",
    flexDirection: "column",
    gap: 40,
  },
  sign: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sign2: {
    width: 150,
    display: "flex",
    flexDirection: "column",
    textAlign: "center",
  },
  image: { width: 50, height: 20, objectFit: "contain" },
  imageContainer: {
    display: "flex",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
