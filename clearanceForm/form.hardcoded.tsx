import font from "../../assets/noto.ttf";
import { Document, Font, Image, Page, Text, View } from "@react-pdf/renderer";
import { depertmentDataOptions as depertment } from "./form.data";
import { styles } from "./style";
import { Student } from "../studentColumns/allStudent";

Font.register({
  family: "Bangla",
  src: font,
});

interface InfoProps {
  info: Student;
  data: any
}

const ClearanceForm: React.FC<InfoProps> = ({ info }) => {
  const fullUrl = `${window.location.origin}${location.pathname}${location.search}`;

  return (
    <Document>
      <Page size={"LEGAL"}>
        <View style={styles.verifyLink}>
          <Text>Verify:{fullUrl}</Text>
        </View>
        <View style={styles.title}>
          <Text style={styles.text}>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার </Text>
          <Text style={styles.text}>অধ্যক্ষের কার্যালয় </Text>
          <Text style={styles.text}>গ্রাফিক আর্টস ইনস্টিটিউট </Text>
          <Text style={styles.text2}>সাত মসজিদ রোড, ঢাকা-১২০৭ </Text>
          <Text style={styles.text2}>দায় মুক্তি ফর্ম </Text>
        </View>
        <View>
          <Text style={styles.text3}>
            গ্রাফিক আর্টস ইনস্টিটিউটের নিম্মেবর্নিত ছাত্র-ছাত্রীর অধ্যায়ন
            সম্পন্ন হয়েছে/ভর্তি বাতিল হয়েছে / অধ্যায়ন করবে না, ফলে
            ইনস্টিটিউটে উক্ত শিক্ষার্থীর নিকট পাওনাদি সম্পর্কে তথ্যাদি প্রয়োজন
            -{" "}
          </Text>

          <View style={styles.t}>
            <View style={styles.table}>
              {/* Table Row 1 */}
              <View style={styles.tableRow}>
                <View style={styles.tableColName}>
                  <Text style={styles.tableCell}>ছাত্র-ছাত্রীর নামঃ</Text>
                </View>
                <View style={styles.tableColTech}>
                  <Text style={styles.tableCell}> টেকনোলজি </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}> রোল </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>রেজি নং </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>সেশন </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>শিফট </Text>
                </View>
              </View>
              {/* Table Row 2 */}
              <View style={styles.tableRow}>
                <View style={styles.tableColName}>
                  <Text style={styles.tableCell}>{info.name}</Text>
                </View>
                <View style={styles.tableColTech}>
                  <Text style={styles.tableCell}>{info.technology}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{info.roll}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{info.registrationNo}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{info.session}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{info.shift}</Text>
                </View>
              </View>
            </View>
            <View style={styles.register}>
              <Text style={styles.text}>
                ..........................................
              </Text>
              <Text style={styles.text}>রেজিস্টার </Text>
              <Text style={styles.text}>গ্রাফিক আর্টস ইনস্টিটিউট</Text>
            </View>
          </View>
        </View>
        <View>
          <View style={styles.t2}>
            <View style={styles.table}>
              {/* Table Row 1 */}
              <View style={styles.tableRow}>
                <View style={styles.tableColId}>
                  <Text style={styles.tableCell}>নং </Text>
                </View>
                <View style={styles.tableColDept}>
                  <Text style={styles.tableCell}> বিভাগ/শাখার নাম </Text>
                </View>
                <View style={styles.tableColSign}>
                  <Text style={styles.tableCell}>টিআর/সপ/ল্যাব সহকারী</Text>
                </View>
                <View style={styles.tableColSign}>
                  <Text style={styles.tableCell}>
                    শাখা প্রধান/ওয়ার্ক শপ সুপারের স্বাক্ষরর
                  </Text>
                </View>
                <View style={styles.tableColSign}>
                  <Text style={styles.tableCell}>
                    বিভাগীয় প্রধানের স্বাক্ষরর
                  </Text>
                </View>
              </View>
              {depertment.map((dept) => (
                <View key={Math.random()} style={styles.tableRow}>
                  <View style={styles.tableColId}>
                    <Text style={styles.tableCell}>{dept.id}</Text>
                  </View>
                  <View style={styles.tableColDept}>
                    <Text style={styles.tableCell}>{dept.depertment}</Text>
                  </View>
                  <View style={styles.tableColSign}>
                    <View style={styles.imageContainer}>
                      {dept.signeture[0][0]?.includes(info.technology) &&
                        (info.shift === "FIRST" ? (
                          dept.signeture[0][1][0] ? (
                            <Image
                              src={dept.signeture[0][1][0]}
                              style={styles.image}
                            />
                          ) : null
                        ) : dept.signeture[0][1][1] ? (
                          <Image
                            src={dept.signeture[0][1][1]}
                            style={styles.image}
                          />
                        ) : null)}
                    </View>
                  </View>
                  <View style={styles.tableColSign}>
                    <View style={styles.imageContainer}>
                      {dept.signeture[1][0]?.includes(info.technology) &&
                        (info.shift === "FIRST" ? (
                          dept.signeture[1][1][0] ? (
                            <Image
                              src={dept.signeture[1][1][0]}
                              style={styles.image}
                            />
                          ) : null
                        ) : dept.signeture[1][1][1] ? (
                          <Image
                            src={dept.signeture[1][1][1]}
                            style={styles.image}
                          />
                        ) : null)}
                    </View>
                  </View>
                  <View style={styles.tableColSign}>
                    <View style={styles.imageContainer}>
                      {dept.signeture[2][0]?.includes(info.technology) &&
                        (info.shift === "FIRST" ? (
                          dept.signeture[2][1][0] ? (
                            <Image
                              src={dept.signeture[2][1][0]}
                              style={styles.image}
                            />
                          ) : null
                        ) : dept.signeture[2][1][1] ? (
                          <Image
                            src={dept.signeture[2][1][1]}
                            style={styles.image}
                          />
                        ) : null)}
                    </View>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.text4}>
              আমানতের টাকা ........................ হতে টাকা কর্তন করে অবশিষ্ট
              ........................ টাকা ফেরত প্রদান করা জেতে পারে ।
            </Text>
            <View style={styles.sign}>
              <View style={styles.sign2}>
                <Text>.....................</Text>
                <Text style={styles.text}>হিসাব রক্ষক</Text>
              </View>
              <View style={styles.sign2}>
                <Text>.....................</Text>
                <Text style={styles.text}>রেজিস্টার </Text>
              </View>
              <View style={styles.sign2}>
                <Text>.....................</Text>
                <Text style={styles.text}>অধ্যক্ষ </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.Wrapper}>
          <View style={styles.box}>
            <Text style={styles.text}>
              উপরিমতে টাকা .................. মাত্র গ্রহন করলাম
            </Text>
            <View>
              <Text style={styles.text}>.................................</Text>
              <Text style={styles.text}>ছাত্র ছাত্রীর স্বাক্ষর </Text>
            </View>
          </View>
          <View style={styles.box}>
            <Text style={styles.text}>
              উপরিমতে টাকা .................. মাত্র প্রদান করলাম
            </Text>
            <View>
              <Text style={styles.text}>.................................</Text>
              <Text style={styles.text}> কোষাধক্ষ্য </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ClearanceForm;
