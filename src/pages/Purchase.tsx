import Card from '../components/ui/Card';
import PurchaseForm from '../components/purchase/PurchaseForm';

const Purchase = () => {
    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-gray-800">Wareneingang</h1>

            <Card>
                <PurchaseForm />
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Hinweis</h3>
                <p className="text-sm text-blue-700">
                    Hier kannst du neue Ware ins Lager buchen. Der Bestand wird automatisch erhöht.
                </p>
            </div>
        </div>
    );
};

export default Purchase;
