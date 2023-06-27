import { pdf, Font, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import Logo from '../assets/images/logo.png';

export const pdfGenerate = ({ category, results, duration }) => {

    Font.register({
        family: 'Montserrat',
        src: 'https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf'
    });
    Font.register({
        family: 'Montserrat',
        src: 'https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-.ttf',
        fontWeight: 'bold'
    });

    const styles = StyleSheet.create({
        page: {
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          fontFamily: 'Montserrat'
        },
        section: {
          paddingHorizontal: 40
        }
    });

    const compileNote = (results = []) => {
        const total = results.reduce((prev, curr) => {
            return prev + parseInt(curr.note);
        }, 0);
        return total + ' / ' + (results.length * 5)
    };

    const compileDuration = (duration = 0) => {
        const seconds = parseInt(duration / 1000);
        const minutes = parseInt(seconds / 60);
        return `${minutes} min ${seconds - (minutes * 60)}s`;
    }

    const Template = () => (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={[styles.section, {paddingVertical: 30, backgroundColor: '#202937', flexDirection: 'column'}]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image src={Logo} style={{ width: 200 }} />
                        <Text style={{ fontSize: 12, color: '#6B7280', marginLeft: 'auto' }}>Domaine: {category}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 30, borderTop: 1, borderTopColor: '#6B7280', paddingTop: 20, justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#6B7280' }}>Note Générale: {compileNote(results)}</Text>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#6B7280' }}>Nbr questions: {results.length}</Text>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#6B7280' }}>Temps: {compileDuration(duration)}</Text>
                    </View>
                </View>
                <View style={[styles.section, { marginTop: 40 }]}>
                    {results.map((item, idx) => (
                        <View key={'_key_' + (idx + 1).toString()} style={{ marginBottom: 35, flexDirection: 'column' }}>
                            <Text style={{ fontSize: 19, color: '#555', fontWeight: 'bold' }}>{ item.title }</Text>
                            <View style={{ marginTop: 10, flexDirection: 'row' }}>
                                <Text style={{ fontSize: 14, width: 110 }}>Question:</Text>
                                <Text style={{ fontSize: 14, flexShrink: 0, flex: 1 }}>{ item.question }</Text>
                            </View>
                            <View style={{ marginTop: 7, flexDirection: 'row', color: item.status === 'correcte' ? 'green' : 'red' }}>
                                <Text style={{ fontSize: 14, width: 110 }}>Reponse:</Text>
                                <Text style={{ fontSize: 14, flexShrink: 0, flex: 1, fontWeight: 'bold' }}>{ item.answer }</Text>
                            </View>
                            <View style={{ marginTop: 7, flexDirection: 'row' }}>
                                <Text style={{ fontSize: 14, width: 110 }}>Correction:</Text>
                                <Text style={{ fontSize: 14, flexShrink: 0, flex: 1 }}>{ item.correct }</Text>
                            </View>
                            <View style={{ marginTop: 7, flexDirection: 'row' }}>
                                <Text style={{ fontSize: 14, width: 110 }}>Note:</Text>
                                <Text style={{ fontSize: 14, flexShrink: 0, flex: 1, fontWeight: 'bold' }}>{ item.note } / 5</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </Page>
        </Document>
    );

    return pdf(<Template />).toBlob();
};